import { withSupabase } from 'npm:@supabase/server@1.4.1';
import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2.110.8';

import { selectEligibleCareDevices } from '../_shared/notification-rules.ts';

type CareEventType = 'diaper' | 'feeding' | 'sleep';

interface DispatchRequest {
  eventId: string;
}

interface FirebaseServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

interface FcmErrorPayload {
  error?: {
    details?: Array<{ errorCode?: string }>;
    status?: string;
  };
}

interface WebPushDevice {
  firebase_installation_id: string;
  id: string;
  user_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};
const firebaseMessagingScope =
  'https://www.googleapis.com/auth/firebase.messaging';
let cachedAccessToken: { expiresAt: number; value: string } | undefined;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { headers: corsHeaders, status });
}

function getRequiredEnvironmentValue(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`missing_${name.toLowerCase()}`);
  }

  return value;
}

function getAdminKey(): string {
  const namedKeys = Deno.env.get('SUPABASE_SECRET_KEYS');

  if (namedKeys) {
    const defaultKey = (JSON.parse(namedKeys) as Record<string, string>).default;

    if (defaultKey) {
      return defaultKey;
    }
  }

  return getRequiredEnvironmentValue('SUPABASE_SERVICE_ROLE_KEY');
}

function createAdminClient(): SupabaseClient {
  const supabaseUrl = getRequiredEnvironmentValue('SUPABASE_URL');
  const adminKey = getAdminKey();
  const adminFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);

    headers.set('apikey', adminKey);

    if (adminKey.startsWith('sb_secret_')) {
      headers.delete('Authorization');
    }

    return fetch(input, { ...init, headers });
  };

  return createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: adminFetch },
  });
}

function getFirebaseServiceAccount(): FirebaseServiceAccount {
  const account = JSON.parse(
    getRequiredEnvironmentValue('FIREBASE_SERVICE_ACCOUNT_JSON'),
  ) as Partial<FirebaseServiceAccount>;

  if (!account.client_email || !account.private_key || !account.project_id) {
    throw new Error('invalid_firebase_service_account');
  }

  return account as FirebaseServiceAccount;
}

function encodeBase64Url(value: string | ArrayBuffer): string {
  const bytes = typeof value === 'string'
    ? new TextEncoder().encode(value)
    : new Uint8Array(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

function decodePem(value: string): ArrayBuffer {
  const encoded = value
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replaceAll(/\s/g, '');
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function createServiceAccountAssertion(
  account: FirebaseServiceAccount,
): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = encodeBase64Url(JSON.stringify({
    aud: 'https://oauth2.googleapis.com/token',
    exp: issuedAt + 3600,
    iat: issuedAt,
    iss: account.client_email,
    scope: firebaseMessagingScope,
  }));
  const unsignedToken = `${header}.${claims}`;
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    decodePem(account.private_key),
    { hash: 'SHA-256', name: 'RSASSA-PKCS1-v1_5' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(unsignedToken),
  );

  return `${unsignedToken}.${encodeBase64Url(signature)}`;
}

async function getFirebaseAccessToken(
  account: FirebaseServiceAccount,
): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.value;
  }

  const assertion = await createServiceAccountAssertion(account);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    body: new URLSearchParams({
      assertion,
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('firebase_oauth_failed');
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error('firebase_access_token_missing');
  }

  cachedAccessToken = {
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    value: payload.access_token,
  };

  return cachedAccessToken.value;
}

function getFcmErrorCode(payload: FcmErrorPayload): string {
  return payload.error?.details?.find((detail) => detail.errorCode)?.errorCode ??
    payload.error?.status ??
    'FCM_REQUEST_FAILED';
}

function isInactiveInstallation(errorCode: string): boolean {
  return errorCode === 'UNREGISTERED' ||
    errorCode === 'INSTALLATION_ID_NOT_REGISTERED';
}

async function sendWebNotification(
  account: FirebaseServiceAccount,
  accessToken: string,
  appUrl: string,
  installationId: string,
): Promise<{ errorCode?: string; messageId?: string }> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      body: JSON.stringify({
        message: {
          fid: installationId,
          notification: {
            body: 'Alguien de tu familia actualiz\u00f3 el relevo.',
            title: 'Nuevo cuidado registrado',
          },
          webpush: {
            fcm_options: { link: appUrl },
            headers: { Urgency: 'normal' },
            notification: {
              badge: `${appUrl}/pwa/icon-192.png`,
              icon: `${appUrl}/pwa/icon-192.png`,
              tag: 'niduna-care-update',
            },
          },
        },
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );
  const payload = (await response.json()) as FcmErrorPayload & { name?: string };

  return response.ok
    ? { messageId: payload.name }
    : { errorCode: getFcmErrorCode(payload) };
}

function getWebAppUrl(request: Request): string {
  const configuredOrigins = (
    Deno.env.get('WEB_APP_ORIGINS') ??
    'https://niduna.com,https://dev.niduna.com'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const requestOrigin = request.headers.get('origin');

  return requestOrigin && configuredOrigins.includes(requestOrigin)
    ? requestOrigin
    : configuredOrigins[0] ?? 'https://niduna.com';
}

const adminClient = createAdminClient();

const authenticatedHandler = withSupabase(
  { auth: 'user' },
  async (request, context) => {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405);
    }

    try {
      const userId = context.userClaims?.id;

      if (!userId) {
        return jsonResponse({ error: 'authentication_required' }, 401);
      }

      const input = (await request.json()) as DispatchRequest;

      if (typeof input.eventId !== 'string' || !input.eventId) {
        return jsonResponse({ error: 'invalid_event_id' }, 400);
      }

      const { data: event, error: eventError } = await context.supabase
        .from('care_events')
        .select('id, baby_id, event_type, recorded_by')
        .eq('id', input.eventId)
        .maybeSingle();

      if (eventError || !event || event.recorded_by !== userId) {
        return jsonResponse({ error: 'event_not_allowed' }, 403);
      }

      const { data: baby, error: babyError } = await adminClient
        .from('babies')
        .select('family_id')
        .eq('id', event.baby_id)
        .maybeSingle();

      if (babyError || !baby) {
        return jsonResponse({ error: 'baby_not_found' }, 404);
      }

      const { data: followers, error: followersError } = await adminClient
        .from('baby_followers')
        .select('user_id')
        .eq('baby_id', event.baby_id)
        .neq('user_id', userId);

      if (followersError || !followers?.length) {
        return jsonResponse({ sent: 0 });
      }

      const recipientIds = followers.map((follower) => follower.user_id);
      const [devicesResult, preferencesResult] = await Promise.all([
        adminClient
          .from('web_push_devices')
          .select('id, firebase_installation_id, user_id')
          .in('user_id', recipientIds)
          .eq('is_active', true),
        adminClient
          .from('notification_preferences')
          .select(
            'user_id, feeding_enabled, diaper_enabled, sleep_enabled, paused_until',
          )
          .eq('family_id', baby.family_id)
          .in('user_id', recipientIds),
      ]);

      if (devicesResult.error || preferencesResult.error) {
        return jsonResponse({ error: 'recipients_unavailable' }, 500);
      }

      const preferencesByUser = new Map(
        (preferencesResult.data ?? []).map((preference) => [
          preference.user_id,
          preference,
        ]),
      );
      const eligibleDevices = selectEligibleCareDevices({
        actorUserId: userId,
        devices: (devicesResult.data ?? []) as WebPushDevice[],
        eventType: event.event_type as CareEventType,
        now: new Date(),
        preferencesByUser,
      });

      if (!eligibleDevices.length) {
        return jsonResponse({ sent: 0 });
      }

      const { data: deliveries, error: deliveryError } = await adminClient
        .from('web_notification_deliveries')
        .upsert(
          eligibleDevices.map((device) => ({
            care_event_id: event.id,
            web_push_device_id: device.id,
          })),
          {
            ignoreDuplicates: true,
            onConflict: 'care_event_id,web_push_device_id',
          },
        )
        .select('id, web_push_device_id');

      if (deliveryError || !deliveries?.length) {
        return jsonResponse({ sent: 0 });
      }

      const account = getFirebaseServiceAccount();
      const accessToken = await getFirebaseAccessToken(account);
      const appUrl = getWebAppUrl(request);
      const deviceById = new Map(
        eligibleDevices.map((device) => [device.id, device]),
      );
      const results = await Promise.all(
        deliveries.map(async (delivery) => {
          const device = deviceById.get(delivery.web_push_device_id);

          if (!device) {
            return false;
          }

          const result = await sendWebNotification(
            account,
            accessToken,
            appUrl,
            device.firebase_installation_id,
          );
          await adminClient
            .from('web_notification_deliveries')
            .update({
              error_code: result.errorCode ?? null,
              fcm_message_id: result.messageId ?? null,
              status: result.messageId ? 'sent' : 'failed',
            })
            .eq('id', delivery.id);

          if (result.errorCode && isInactiveInstallation(result.errorCode)) {
            await adminClient
              .from('web_push_devices')
              .update({ is_active: false })
              .eq('id', device.id);
          }

          return Boolean(result.messageId);
        }),
      );

      return jsonResponse({ sent: results.filter(Boolean).length });
    } catch {
      return jsonResponse({ error: 'unexpected_web_notification_error' }, 500);
    }
  },
);

Deno.serve((request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return authenticatedHandler(request);
});
