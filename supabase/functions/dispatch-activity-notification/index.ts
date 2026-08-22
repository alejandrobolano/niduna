import { withSupabase } from 'npm:@supabase/server@1.4.1';
import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2.110.8';

import {
  selectEligibleActivityDevices,
  type ActivityNotificationCategory,
  type ActivityRecipientPreference,
} from '../_shared/activity-notification-rules.ts';
import { activityNotificationCopy } from '../_shared/notification-copy.ts';

type DeliveryChannel = 'native' | 'web';

interface DispatchRequest {
  activityId: string;
  activityType: ActivityNotificationCategory;
}

interface ActivityRecord {
  baby_id: string;
  id: string;
  recorded_by: string;
}

interface ExpoDevice {
  expo_push_token: string;
  id: string;
  user_id: string;
}

interface WebDevice {
  firebase_installation_id: string;
  id: string;
  user_id: string;
}

interface Delivery {
  device_id: string;
  id: string;
}

interface ExpoTicket {
  details?: { error?: string };
  id?: string;
  status: 'error' | 'ok';
}

interface ExpoReceipt {
  details?: { error?: string };
  status: 'error' | 'ok';
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

async function loadActivity(
  userClient: SupabaseClient,
  activityType: ActivityNotificationCategory,
  activityId: string,
): Promise<ActivityRecord | undefined> {
  if (activityType === 'story') {
    const { data, error } = await userClient
      .from('family_stories')
      .select('id, baby_id, author_user_id, published_at, removed_at, expires_at')
      .eq('id', activityId)
      .maybeSingle();

    if (
      error ||
      !data ||
      !data.published_at ||
      data.removed_at ||
      Date.parse(data.expires_at) <= Date.now()
    ) {
      return undefined;
    }

    return {
      baby_id: data.baby_id,
      id: data.id,
      recorded_by: data.author_user_id,
    };
  }

  const table = activityType === 'note' ? 'baby_notes' : 'baby_measurements';
  const { data, error } = await userClient
    .from(table)
    .select('id, baby_id, recorded_by')
    .eq('id', activityId)
    .maybeSingle();

  return error || !data ? undefined : data as ActivityRecord;
}

async function createDeliveries(
  adminClient: SupabaseClient,
  activityId: string,
  activityType: ActivityNotificationCategory,
  channel: DeliveryChannel,
  deviceIds: string[],
): Promise<Delivery[]> {
  if (!deviceIds.length) {
    return [];
  }

  const { data, error } = await adminClient
    .from('family_activity_notification_deliveries')
    .upsert(
      deviceIds.map((deviceId) => ({
        channel,
        device_id: deviceId,
        source_id: activityId,
        source_type: activityType,
      })),
      {
        ignoreDuplicates: true,
        onConflict: 'source_type,source_id,channel,device_id',
      },
    )
    .select('id, device_id');

  return error ? [] : (data ?? []) as Delivery[];
}

async function markDeliveriesFailed(
  adminClient: SupabaseClient,
  deliveries: Delivery[],
  errorCode: string,
): Promise<void> {
  if (!deliveries.length) {
    return;
  }

  await adminClient
    .from('family_activity_notification_deliveries')
    .update({ error_code: errorCode, status: 'failed' })
    .in('id', deliveries.map((delivery) => delivery.id));
}

async function processExpoReceipts(adminClient: SupabaseClient): Promise<void> {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: deliveries } = await adminClient
    .from('family_activity_notification_deliveries')
    .select('id, provider_message_id, device_id')
    .eq('channel', 'native')
    .eq('status', 'sent')
    .not('provider_message_id', 'is', null)
    .lt('created_at', cutoff)
    .limit(1000);

  if (!deliveries?.length) {
    return;
  }

  const receiptIds = deliveries
    .map((delivery) => delivery.provider_message_id)
    .filter((receiptId): receiptId is string => Boolean(receiptId));
  const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
    body: JSON.stringify({ ids: receiptIds }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    return;
  }

  const payload = (await response.json()) as {
    data?: Record<string, ExpoReceipt>;
  };

  await Promise.all(
    deliveries.map(async (delivery) => {
      const receiptId = delivery.provider_message_id;
      const receipt = receiptId ? payload.data?.[receiptId] : undefined;

      if (!receipt) {
        return;
      }

      const errorCode = receipt.details?.error;
      await adminClient
        .from('family_activity_notification_deliveries')
        .update({
          error_code: errorCode ?? null,
          status: receipt.status === 'ok' ? 'delivered' : 'failed',
        })
        .eq('id', delivery.id);

      if (errorCode === 'DeviceNotRegistered') {
        await adminClient
          .from('push_devices')
          .update({ is_active: false })
          .eq('id', delivery.device_id);
      }
    }),
  );
}

async function dispatchNative(
  adminClient: SupabaseClient,
  activityId: string,
  activityType: ActivityNotificationCategory,
  devices: ExpoDevice[],
): Promise<number> {
  await processExpoReceipts(adminClient);
  const deliveries = await createDeliveries(
    adminClient,
    activityId,
    activityType,
    'native',
    devices.map((device) => device.id),
  );

  if (!deliveries.length) {
    return 0;
  }

  const copy = activityNotificationCopy[activityType];
  const deviceById = new Map(devices.map((device) => [device.id, device]));
  let response: Response;

  try {
    response = await fetch('https://exp.host/--/api/v2/push/send', {
      body: JSON.stringify(deliveries.map((delivery) => ({
        ...copy,
        channelId: 'care-updates',
        to: deviceById.get(delivery.device_id)?.expo_push_token,
      }))),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  } catch {
    await markDeliveriesFailed(adminClient, deliveries, 'EXPO_PUSH_UNAVAILABLE');
    return 0;
  }

  if (!response.ok) {
    await markDeliveriesFailed(adminClient, deliveries, 'EXPO_PUSH_UNAVAILABLE');
    return 0;
  }

  const payload = (await response.json()) as { data?: ExpoTicket[] };
  const tickets = payload.data ?? [];

  await Promise.all(
    deliveries.map(async (delivery, index) => {
      const ticket = tickets[index];
      const errorCode = ticket?.details?.error;

      await adminClient
        .from('family_activity_notification_deliveries')
        .update({
          error_code: errorCode ?? null,
          provider_message_id: ticket?.id ?? null,
          status: ticket?.status === 'ok' ? 'sent' : 'failed',
        })
        .eq('id', delivery.id);

      if (errorCode === 'DeviceNotRegistered') {
        await adminClient
          .from('push_devices')
          .update({ is_active: false })
          .eq('id', delivery.device_id);
      }
    }),
  );

  return tickets.filter((ticket) => ticket.status === 'ok').length;
}

async function sendWebNotification(
  account: FirebaseServiceAccount,
  accessToken: string,
  appUrl: string,
  installationId: string,
  activityType: ActivityNotificationCategory,
): Promise<{ errorCode?: string; messageId?: string }> {
  const copy = activityNotificationCopy[activityType];
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      body: JSON.stringify({
        message: {
          fid: installationId,
          notification: copy,
          webpush: {
            fcm_options: { link: appUrl },
            headers: { Urgency: 'normal' },
            notification: {
              badge: `${appUrl}/pwa/icon-192.png`,
              icon: `${appUrl}/pwa/icon-192.png`,
              tag: `niduna-${activityType}-update`,
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

async function dispatchWeb(
  adminClient: SupabaseClient,
  request: Request,
  activityId: string,
  activityType: ActivityNotificationCategory,
  devices: WebDevice[],
): Promise<number> {
  const deliveries = await createDeliveries(
    adminClient,
    activityId,
    activityType,
    'web',
    devices.map((device) => device.id),
  );

  if (!deliveries.length) {
    return 0;
  }

  let account: FirebaseServiceAccount;
  let accessToken: string;

  try {
    account = getFirebaseServiceAccount();
    accessToken = await getFirebaseAccessToken(account);
  } catch {
    await markDeliveriesFailed(adminClient, deliveries, 'FIREBASE_AUTH_FAILED');
    return 0;
  }

  const appUrl = getWebAppUrl(request);
  const deviceById = new Map(devices.map((device) => [device.id, device]));
  const results = await Promise.all(
    deliveries.map(async (delivery) => {
      const device = deviceById.get(delivery.device_id);

      if (!device) {
        return false;
      }

      let result: { errorCode?: string; messageId?: string };

      try {
        result = await sendWebNotification(
          account,
          accessToken,
          appUrl,
          device.firebase_installation_id,
          activityType,
        );
      } catch {
        result = { errorCode: 'FCM_REQUEST_FAILED' };
      }
      await adminClient
        .from('family_activity_notification_deliveries')
        .update({
          error_code: result.errorCode ?? null,
          provider_message_id: result.messageId ?? null,
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

  return results.filter(Boolean).length;
}

function isDispatchRequest(value: unknown): value is DispatchRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const input = value as Partial<DispatchRequest>;

  return typeof input.activityId === 'string' &&
    Boolean(input.activityId) &&
    (input.activityType === 'note' ||
      input.activityType === 'measurement' ||
      input.activityType === 'story');
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

      const input = await request.json();

      if (!isDispatchRequest(input)) {
        return jsonResponse({ error: 'invalid_activity' }, 400);
      }

      const activity = await loadActivity(
        context.supabase,
        input.activityType,
        input.activityId,
      );

      if (!activity || activity.recorded_by !== userId) {
        return jsonResponse({ error: 'activity_not_allowed' }, 403);
      }

      const { data: baby, error: babyError } = await adminClient
        .from('babies')
        .select('family_id')
        .eq('id', activity.baby_id)
        .maybeSingle();

      if (babyError || !baby) {
        return jsonResponse({ error: 'baby_not_found' }, 404);
      }

      const { data: followers, error: followersError } = await adminClient
        .from('baby_followers')
        .select('user_id')
        .eq('baby_id', activity.baby_id)
        .neq('user_id', userId);

      if (followersError || !followers?.length) {
        return jsonResponse({ nativeSent: 0, webSent: 0 });
      }

      const recipientIds = followers.map((follower) => follower.user_id);
      const [nativeResult, webResult, preferencesResult] = await Promise.all([
        adminClient
          .from('push_devices')
          .select('id, expo_push_token, user_id')
          .in('user_id', recipientIds)
          .eq('is_active', true),
        adminClient
          .from('web_push_devices')
          .select('id, firebase_installation_id, user_id')
          .in('user_id', recipientIds)
          .eq('is_active', true),
        adminClient
          .from('notification_preferences')
          .select(
            'user_id, note_enabled, measurement_enabled, story_enabled, paused_until',
          )
          .eq('family_id', baby.family_id)
          .in('user_id', recipientIds),
      ]);

      if (nativeResult.error || webResult.error || preferencesResult.error) {
        return jsonResponse({ error: 'recipients_unavailable' }, 500);
      }

      const preferencesByUser = new Map<string, ActivityRecipientPreference>(
        (preferencesResult.data ?? []).map((preference) => [
          preference.user_id,
          preference as ActivityRecipientPreference,
        ]),
      );
      const now = new Date();
      const nativeDevices = selectEligibleActivityDevices({
        actorUserId: userId,
        category: input.activityType,
        devices: (nativeResult.data ?? []) as ExpoDevice[],
        now,
        preferencesByUser,
      });
      const webDevices = selectEligibleActivityDevices({
        actorUserId: userId,
        category: input.activityType,
        devices: (webResult.data ?? []) as WebDevice[],
        now,
        preferencesByUser,
      });
      const [nativeDispatch, webDispatch] = await Promise.allSettled([
        dispatchNative(
          adminClient,
          activity.id,
          input.activityType,
          nativeDevices,
        ),
        dispatchWeb(
          adminClient,
          request,
          activity.id,
          input.activityType,
          webDevices,
        ),
      ]);

      return jsonResponse({
        nativeSent: nativeDispatch.status === 'fulfilled'
          ? nativeDispatch.value
          : 0,
        webSent: webDispatch.status === 'fulfilled' ? webDispatch.value : 0,
      });
    } catch {
      return jsonResponse({ error: 'unexpected_activity_notification_error' }, 500);
    }
  },
);

Deno.serve((request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return authenticatedHandler(request);
});
