import { withSupabase } from 'npm:@supabase/server@1.4.1';
import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2.110.8';

import { shouldNotifyCareFollower } from '../_shared/notification-rules.ts';

type CareEventType = 'diaper' | 'feeding' | 'sleep';

interface DispatchRequest {
  eventId: string;
}

interface ExpoTicket {
  details?: { error?: string };
  id?: string;
  message?: string;
  status: 'error' | 'ok';
}

interface ExpoReceipt {
  details?: { error?: string };
  message?: string;
  status: 'error' | 'ok';
}

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { headers: corsHeaders, status });
}

function getAdminKey(): string {
  const namedKeys = Deno.env.get('SUPABASE_SECRET_KEYS');

  if (namedKeys) {
    const defaultKey = (JSON.parse(namedKeys) as Record<string, string>).default;

    if (defaultKey) {
      return defaultKey;
    }
  }

  const legacyKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!legacyKey) {
    throw new Error('missing_supabase_admin_key');
  }

  return legacyKey;
}

function createAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const adminKey = getAdminKey();

  if (!supabaseUrl) {
    throw new Error('missing_supabase_admin_configuration');
  }

  const adminFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);

    headers.set('apikey', adminKey);

    if (adminKey.startsWith('sb_secret_')) {
      headers.delete('Authorization');
    }

    return fetch(input, { ...init, headers });
  };

  return createClient(supabaseUrl, adminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: { fetch: adminFetch },
  });
}

const adminClient = createAdminClient();

async function processReceipts(adminClient: SupabaseClient): Promise<void> {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: deliveries } = await adminClient
    .from('notification_deliveries')
    .select('id, expo_receipt_id, push_device_id')
    .eq('status', 'sent')
    .not('expo_receipt_id', 'is', null)
    .lt('created_at', cutoff)
    .limit(1000);

  if (!deliveries?.length) {
    return;
  }

  const receiptIds = deliveries
    .map((delivery) => delivery.expo_receipt_id)
    .filter((receiptId): receiptId is string => Boolean(receiptId));
  const response = await fetch(
    'https://exp.host/--/api/v2/push/getReceipts',
    {
      body: JSON.stringify({ ids: receiptIds }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
  );

  if (!response.ok) {
    return;
  }

  const payload = (await response.json()) as {
    data?: Record<string, ExpoReceipt>;
  };

  await Promise.all(
    deliveries.map(async (delivery) => {
      if (!delivery.expo_receipt_id) {
        return;
      }

      const receipt = payload.data?.[delivery.expo_receipt_id];

      if (!receipt) {
        return;
      }

      const errorCode = receipt.details?.error;
      await adminClient
        .from('notification_deliveries')
        .update({
          error_code: errorCode ?? null,
          status: receipt.status === 'ok' ? 'delivered' : 'failed',
          updated_at: new Date().toISOString(),
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

    const userClient = context.supabase;
    const input = (await request.json()) as DispatchRequest;

    if (typeof input.eventId !== 'string' || !input.eventId) {
      return jsonResponse({ error: 'invalid_event_id' }, 400);
    }

    const { data: event, error: eventError } = await userClient
      .from('care_events')
      .select('id, baby_id, event_type, recorded_by')
      .eq('id', input.eventId)
      .maybeSingle();

    if (eventError || !event || event.recorded_by !== userId) {
      return jsonResponse({ error: 'event_not_allowed' }, 403);
    }

    await processReceipts(adminClient);

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
        .from('push_devices')
        .select('id, expo_push_token, user_id')
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
    const eligibleDevices = (devicesResult.data ?? []).filter((device) => {
      const preference = preferencesByUser.get(device.user_id);

      return shouldNotifyCareFollower({
        actorUserId: userId,
        eventType: event.event_type as CareEventType,
        hasActiveDevice: true,
        isActiveFollower: true,
        now: new Date(),
        preference,
        recipientUserId: device.user_id,
      });
    });

    if (!eligibleDevices.length) {
      return jsonResponse({ sent: 0 });
    }

    const { data: insertedDeliveries, error: deliveryError } = await adminClient
      .from('notification_deliveries')
      .upsert(
        eligibleDevices.map((device) => ({
          care_event_id: event.id,
          push_device_id: device.id,
        })),
        {
          ignoreDuplicates: true,
          onConflict: 'care_event_id,push_device_id',
        },
      )
      .select('id, push_device_id');

    if (deliveryError || !insertedDeliveries?.length) {
      return jsonResponse({ sent: 0 });
    }

    const deviceById = new Map(
      eligibleDevices.map((device) => [device.id, device]),
    );
    const messages = insertedDeliveries.map((delivery) => ({
      body: 'Alguien de tu familia actualizó el relevo.',
      channelId: 'care-updates',
      title: 'Nuevo cuidado registrado',
      to: deviceById.get(delivery.push_device_id)?.expo_push_token,
    }));
    const expoResponse = await fetch(
      'https://exp.host/--/api/v2/push/send',
      {
        body: JSON.stringify(messages),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      },
    );

    if (!expoResponse.ok) {
      await Promise.all(
        insertedDeliveries.map((delivery) =>
          adminClient
            .from('notification_deliveries')
            .update({ status: 'failed' })
            .eq('id', delivery.id),
        ),
      );
      return jsonResponse({ error: 'expo_push_unavailable' }, 502);
    }

    const expoPayload = (await expoResponse.json()) as { data?: ExpoTicket[] };
    const tickets = expoPayload.data ?? [];

    await Promise.all(
      insertedDeliveries.map(async (delivery, index) => {
        const ticket = tickets[index];
        const device = deviceById.get(delivery.push_device_id);
        const errorCode = ticket?.details?.error;

        await adminClient
          .from('notification_deliveries')
          .update({
            error_code: errorCode ?? null,
            expo_receipt_id: ticket?.id ?? null,
            status: ticket?.status === 'ok' ? 'sent' : 'failed',
          })
          .eq('id', delivery.id);

        if (errorCode === 'DeviceNotRegistered' && device) {
          await adminClient
            .from('push_devices')
            .update({ is_active: false })
            .eq('id', device.id);
        }
      }),
    );

    return jsonResponse({
      sent: tickets.filter((ticket) => ticket.status === 'ok').length,
    });
  } catch {
    return jsonResponse({ error: 'unexpected_notification_error' }, 500);
  }
  },
);

Deno.serve((request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return authenticatedHandler(request);
});
