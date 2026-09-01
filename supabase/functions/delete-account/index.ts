import { withSupabase } from 'npm:@supabase/server@1.4.1';
import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2.110.8';

import {
  chunkValues,
  parseDeleteAccountRequest,
} from '../_shared/account-deletion-rules.ts';

interface UserClaims {
  id?: string;
}

interface OwnedFamily {
  id: string;
  name: string;
}

const corsHeaders = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

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

    if (
      adminKey.startsWith('sb_secret_') &&
      headers.get('Authorization') === `Bearer ${adminKey}`
    ) {
      headers.delete('Authorization');
    }

    return fetch(input, { ...init, headers });
  };

  return createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: adminFetch },
  });
}

function getBearerToken(request: Request): string | undefined {
  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }

  return authorization.slice('Bearer '.length);
}

async function readRequestBody(request: Request) {
  try {
    return parseDeleteAccountRequest(await request.json());
  } catch {
    return undefined;
  }
}

async function loadOwnedFamilies(
  adminClient: SupabaseClient,
  userId: string,
): Promise<OwnedFamily[]> {
  const { data: memberships, error: membershipError } = await adminClient
    .from('family_members')
    .select('family_id')
    .eq('user_id', userId)
    .eq('role', 'owner');

  if (membershipError) {
    throw membershipError;
  }

  const familyIds = (memberships ?? []).map((membership) => membership.family_id);
  if (familyIds.length === 0) {
    return [];
  }

  const { data: families, error: familyError } = await adminClient
    .from('families')
    .select('id, name')
    .in('id', familyIds);

  if (familyError) {
    throw familyError;
  }

  return families ?? [];
}

async function loadOwnedFamilyStoragePaths(
  adminClient: SupabaseClient,
  familyIds: string[],
): Promise<{ babyDocuments: string[]; babyPhotos: string[]; familyStories: string[] }> {
  if (familyIds.length === 0) {
    return { babyDocuments: [], babyPhotos: [], familyStories: [] };
  }

  const [babiesResult, storiesResult, documentsResult] = await Promise.all([
    adminClient
      .from('babies')
      .select('photo_path')
      .in('family_id', familyIds)
      .not('photo_path', 'is', null),
    adminClient
      .from('family_stories')
      .select('storage_path')
      .in('family_id', familyIds),
    adminClient
      .from('baby_documents')
      .select('storage_path')
      .in('family_id', familyIds),
  ]);

  if (babiesResult.error) {
    throw babiesResult.error;
  }

  if (storiesResult.error) {
    throw storiesResult.error;
  }

  if (documentsResult.error) {
    throw documentsResult.error;
  }

  return {
    babyDocuments: [...new Set(
      (documentsResult.data ?? []).map((document) => document.storage_path),
    )],
    babyPhotos: [...new Set(
      (babiesResult.data ?? [])
        .map((baby) => baby.photo_path)
        .filter((path): path is string => typeof path === 'string'),
    )],
    familyStories: [...new Set(
      (storiesResult.data ?? []).map((story) => story.storage_path),
    )],
  };
}

async function removeStoragePaths(
  adminClient: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<void> {
  for (const pathChunk of chunkValues(paths, 1000)) {
    const { error } = await adminClient.storage.from(bucket).remove(pathChunk);

    if (error) {
      throw error;
    }
  }
}

const authenticatedHandler = withSupabase(
  { auth: 'user' },
  async (request, context) => {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405);
    }

    const claims = context.userClaims as UserClaims | undefined;
    const userId = claims?.id;
    const accessToken = getBearerToken(request);

    if (!userId || !accessToken) {
      return jsonResponse({ error: 'authentication_required' }, 401);
    }

    try {
      const requestBody = await readRequestBody(request);
      if (!requestBody) {
        return jsonResponse({ error: 'invalid_request' }, 400);
      }

      const adminClient = createAdminClient();
      const ownedFamilies = await loadOwnedFamilies(adminClient, userId);

      if (ownedFamilies.length > 0 && !requestBody.deleteOwnedFamilies) {
        return jsonResponse(
          {
            error: 'account_owns_family',
            families: ownedFamilies.map((family) => family.name),
          },
          409,
        );
      }

      if (requestBody.deleteOwnedFamilies) {
        const familyIds = ownedFamilies.map((family) => family.id);
        const storagePaths = await loadOwnedFamilyStoragePaths(
          adminClient,
          familyIds,
        );

        await removeStoragePaths(
          adminClient,
          'baby-photos',
          storagePaths.babyPhotos,
        );
        await removeStoragePaths(
          adminClient,
          'family-stories',
          storagePaths.familyStories,
        );
        await removeStoragePaths(
          adminClient,
          'baby-documents',
          storagePaths.babyDocuments,
        );
      }

      const { error: cleanupError } = await adminClient.rpc(
        requestBody.deleteOwnedFamilies
          ? 'delete_owned_families_and_personal_account_data'
          : 'delete_personal_account_data',
        { target_user_id: userId },
      );

      if (cleanupError) {
        if (cleanupError.message.includes('account_owns_family')) {
          return jsonResponse({ error: 'account_owns_family' }, 409);
        }

        throw cleanupError;
      }

      const { error: signOutError } = await adminClient.auth.admin.signOut(
        accessToken,
        'global',
      );

      if (signOutError) {
        throw signOutError;
      }

      const { error: deletionError } = await adminClient.auth.admin.deleteUser(
        userId,
        true,
      );

      if (deletionError) {
        throw deletionError;
      }

      return jsonResponse({ deleted: true });
    } catch (error) {
      console.error(
        error instanceof Error ? error.message : 'account_deletion_failed',
      );
      return jsonResponse({ error: 'account_deletion_failed' }, 500);
    }
  },
);

Deno.serve((request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  return authenticatedHandler(request);
});
