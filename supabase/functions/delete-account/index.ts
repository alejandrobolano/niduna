import { withSupabase } from 'npm:@supabase/server@1.4.1';
import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2.110.8';

import {
  hasRecentOtpAuthentication,
  type AuthenticationMethodReference,
} from '../_shared/account-deletion-rules.ts';

interface UserClaims {
  amr?: AuthenticationMethodReference[];
  id?: string;
}

const recentAuthenticationSeconds = 10 * 60;
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

function getBearerToken(request: Request): string | undefined {
  const authorization = request.headers.get('Authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }

  return authorization.slice('Bearer '.length);
}

function hasRecentAuthentication(claims: UserClaims): boolean {
  return hasRecentOtpAuthentication(
    claims.amr,
    Math.floor(Date.now() / 1000),
    recentAuthenticationSeconds,
  );
}

async function loadOwnedFamilyNames(
  adminClient: SupabaseClient,
  userId: string,
): Promise<string[]> {
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
    .select('name')
    .in('id', familyIds);

  if (familyError) {
    throw familyError;
  }

  return (families ?? []).map((family) => family.name);
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

    if (!hasRecentAuthentication(claims)) {
      return jsonResponse({ error: 'recent_authentication_required' }, 401);
    }

    try {
      const adminClient = createAdminClient();
      const ownedFamilyNames = await loadOwnedFamilyNames(adminClient, userId);

      if (ownedFamilyNames.length > 0) {
        return jsonResponse(
          { error: 'account_owns_family', families: ownedFamilyNames },
          409,
        );
      }

      const { error: cleanupError } = await adminClient.rpc(
        'delete_personal_account_data',
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
    } catch {
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
