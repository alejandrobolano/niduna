import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2.110.8';

interface EasBuildWebhookPayload {
  appId?: string;
  artifacts?: { buildUrl?: string };
  buildDetailsPageUrl?: string;
  completedAt?: string;
  id?: string;
  metadata?: {
    appBuildVersion?: string;
    appVersion?: string;
    buildProfile?: string;
    distribution?: string;
    gitCommitHash?: string;
  };
  platform?: string;
  status?: string;
}

interface ExpoTicket {
  details?: { error?: string };
  id?: string;
  status: 'error' | 'ok';
}

interface PushDevice {
  expo_push_token: string;
  id: string;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { headers: jsonHeaders, status });
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

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return difference === 0;
}

async function hasValidSignature(
  body: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) {
    return false;
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { hash: 'SHA-1', name: 'HMAC' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(body));

  return safeEqual(signature.toLowerCase(), `sha1=${toHex(digest)}`);
}

function isExpectedPreviewBuild(payload: EasBuildWebhookPayload): boolean {
  return (
    payload.appId === getRequiredEnvironmentValue('EAS_PROJECT_ID') &&
    payload.platform === 'android' &&
    payload.status === 'finished' &&
    payload.metadata?.buildProfile === 'preview' &&
    payload.metadata.distribution === 'internal'
  );
}

function isValidBuildPayload(payload: EasBuildWebhookPayload): boolean {
  return Boolean(
    payload.id &&
      payload.artifacts?.buildUrl &&
      payload.buildDetailsPageUrl &&
      payload.completedAt &&
      payload.metadata?.appBuildVersion &&
      payload.metadata.appVersion,
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function sendNotifications(
  adminClient: SupabaseClient,
  buildId: string,
  artifactUrl: string,
): Promise<number> {
  const { data: devices, error: devicesError } = await adminClient
    .from('push_devices')
    .select('id, expo_push_token')
    .eq('platform', 'android')
    .eq('is_active', true);

  if (devicesError) {
    throw new Error('push_devices_load_failed');
  }

  if (!devices?.length) {
    return 0;
  }

  const { data: deliveries, error: deliveriesError } = await adminClient
    .from('app_release_notification_deliveries')
    .upsert(
      (devices as PushDevice[]).map((device) => ({
        eas_build_id: buildId,
        push_device_id: device.id,
      })),
      {
        ignoreDuplicates: true,
        onConflict: 'eas_build_id,push_device_id',
      },
    )
    .select('id, push_device_id');

  if (deliveriesError) {
    throw new Error('release_deliveries_create_failed');
  }

  if (!deliveries?.length) {
    return 0;
  }

  const deviceById = new Map(
    (devices as PushDevice[]).map((device) => [device.id, device]),
  );
  let sent = 0;

  for (const deliveryBatch of chunk(deliveries, 100)) {
    const messages = deliveryBatch.map((delivery) => ({
      body: 'Ya puedes descargar la nueva APK de prueba desde Niduna.',
      channelId: 'care-updates',
      data: { type: 'app_update', url: artifactUrl },
      title: 'Nueva versión de Niduna',
      to: deviceById.get(delivery.push_device_id)?.expo_push_token,
    }));
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      body: JSON.stringify(messages),
      headers: jsonHeaders,
      method: 'POST',
    });

    if (!response.ok) {
      await Promise.all(
        deliveryBatch.map((delivery) =>
          adminClient
            .from('app_release_notification_deliveries')
            .update({ status: 'failed' })
            .eq('id', delivery.id),
        ),
      );
      continue;
    }

    const payload = (await response.json()) as { data?: ExpoTicket[] };
    const tickets = payload.data ?? [];

    await Promise.all(
      deliveryBatch.map(async (delivery, index) => {
        const ticket = tickets[index];
        const errorCode = ticket?.details?.error;

        if (ticket?.status === 'ok') {
          sent += 1;
        }

        await adminClient
          .from('app_release_notification_deliveries')
          .update({
            error_code: errorCode ?? null,
            expo_receipt_id: ticket?.id ?? null,
            status: ticket?.status === 'ok' ? 'sent' : 'failed',
          })
          .eq('id', delivery.id);

        if (errorCode === 'DeviceNotRegistered') {
          await adminClient
            .from('push_devices')
            .update({ is_active: false })
            .eq('id', delivery.push_device_id);
        }
      }),
    );
  }

  return sent;
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    const body = await request.text();
    const webhookSecret = getRequiredEnvironmentValue('EAS_WEBHOOK_SECRET');
    const signature = request.headers.get('expo-signature');

    if (!(await hasValidSignature(body, signature, webhookSecret))) {
      return jsonResponse({ error: 'invalid_signature' }, 401);
    }

    const payload = JSON.parse(body) as EasBuildWebhookPayload;

    if (!isExpectedPreviewBuild(payload)) {
      return jsonResponse({ ignored: true });
    }

    if (!isValidBuildPayload(payload)) {
      return jsonResponse({ error: 'invalid_build_payload' }, 400);
    }

    const buildId = payload.id as string;
    const artifactUrl = payload.artifacts?.buildUrl as string;
    const adminClient = createAdminClient();
    const { error: releaseError } = await adminClient
      .from('app_releases')
      .upsert({
        app_build_version: payload.metadata?.appBuildVersion as string,
        app_version: payload.metadata?.appVersion as string,
        artifact_url: artifactUrl,
        build_details_url: payload.buildDetailsPageUrl as string,
        build_profile: 'preview',
        completed_at: payload.completedAt as string,
        distribution: 'internal',
        eas_build_id: buildId,
        git_commit_hash: payload.metadata?.gitCommitHash ?? null,
        platform: 'android',
      });

    if (releaseError) {
      throw new Error('app_release_save_failed');
    }

    const sent = await sendNotifications(adminClient, buildId, artifactUrl);

    return jsonResponse({ buildId, sent });
  } catch {
    return jsonResponse({ error: 'unexpected_eas_webhook_error' }, 500);
  }
});
