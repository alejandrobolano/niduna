import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.110.8';

interface ClaimedDocumentObject {
  id: number;
  storage_path: string;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { headers: jsonHeaders, status });
}

function requiredEnvironmentValue(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function adminKey(): string {
  const namedKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (namedKeys) {
    const key = (JSON.parse(namedKeys) as Record<string, string>).default;
    if (key) return key;
  }
  return requiredEnvironmentValue('SUPABASE_SERVICE_ROLE_KEY');
}

function createAdminClient(): SupabaseClient {
  const key = adminKey();
  const adminFetch: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set('apikey', key);
    if (key.startsWith('sb_secret_')) headers.delete('Authorization');
    return fetch(input, { ...init, headers });
  };
  return createClient(requiredEnvironmentValue('SUPABASE_URL'), key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: adminFetch },
  });
}

async function markFailure(client: SupabaseClient, item: ClaimedDocumentObject, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'cleanup_failed';
  await client.from('baby_document_storage_cleanup').update({
    claimed_at: null,
    last_error: message.slice(0, 500),
    status: 'failed',
  }).eq('id', item.id);
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);

  try {
    const client = createAdminClient();
    const { data, error } = await client.rpc('claim_baby_document_storage_cleanup', { batch_size: 100 });
    if (error) throw error;

    const items = (data ?? []) as ClaimedDocumentObject[];
    let removed = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const { error: storageError } = await client.storage.from('baby-documents').remove([item.storage_path]);
        if (storageError) throw storageError;
        const { error: metadataError } = await client.from('baby_document_storage_cleanup').delete().eq('id', item.id);
        if (metadataError) throw metadataError;
        removed += 1;
      } catch (error) {
        failed += 1;
        await markFailure(client, item, error);
      }
    }

    return jsonResponse({ claimed: items.length, failed, removed });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'cleanup_failed' }, 500);
  }
});
