import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2.110.8';

interface ClaimedStory {
  id: string;
  storage_path: string;
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

async function markFailure(
  adminClient: SupabaseClient,
  storyId: string,
  error: unknown,
): Promise<void> {
  const message = error instanceof Error ? error.message : 'cleanup_failed';

  await adminClient
    .from('family_stories')
    .update({
      cleanup_claimed_at: null,
      cleanup_last_error: message.slice(0, 500),
      cleanup_status: 'failed',
    })
    .eq('id', storyId);
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405);
  }

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.rpc(
      'claim_family_stories_for_cleanup',
      { batch_size: 100 },
    );

    if (error) {
      throw error;
    }

    const stories = (data ?? []) as ClaimedStory[];
    let removed = 0;
    let failed = 0;

    for (const story of stories) {
      try {
        const { error: storageError } = await adminClient.storage
          .from('family-stories')
          .remove([story.storage_path]);

        if (storageError) {
          throw storageError;
        }

        const { error: metadataError } = await adminClient
          .from('family_stories')
          .delete()
          .eq('id', story.id);

        if (metadataError) {
          throw metadataError;
        }

        removed += 1;
      } catch (error) {
        failed += 1;
        await markFailure(adminClient, story.id, error);
      }
    }

    return jsonResponse({ claimed: stories.length, failed, removed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'cleanup_failed';
    return jsonResponse({ error: message }, 500);
  }
});
