import type { AuthError, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import type { AuthService } from '@/features/auth/application/auth-service';
import {
  AuthFailure,
  type AuthSession,
} from '@/features/auth/domain/auth';
import { parseAuthLink } from '@/features/auth/infrastructure/auth-link';
import { mapSupabaseAuthFailure } from '@/features/auth/infrastructure/supabase-auth-failure';
import { supabase } from '@/shared/infrastructure/supabase/client';

function toAuthSession(session: Session | null): AuthSession | null {
  const email = session?.user.email;
  if (!session || !email) {
    return null;
  }

  return {
    user: {
      email,
      id: session.user.id,
    },
  };
}

export const supabaseAuthService: AuthService = {
  async completeEmailLink(url) {
    const { accessToken, code, refreshToken, tokenHash } = parseAuthLink(url);
    let result: { data: { session: Session | null }; error: AuthError | null };

    if (tokenHash) {
      result = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });
    } else if (code) {
      result = await supabase.auth.exchangeCodeForSession(code);
    } else if (accessToken && refreshToken) {
      result = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } else {
      return null;
    }

    if (result.error) {
      throw mapSupabaseAuthFailure(result.error);
    }

    return toAuthSession(result.data.session);
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw mapSupabaseAuthFailure(error);
    }

    return toAuthSession(data.session);
  },

  onSessionChange(listener) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      listener(toAuthSession(session));
    });

    return () => subscription.unsubscribe();
  },

  async requestEmailCode(email) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: Linking.createURL('/'),
          shouldCreateUser: true,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      throw mapSupabaseAuthFailure(error);
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      throw mapSupabaseAuthFailure(error);
    }
  },

  startAutoRefresh() {
    supabase.auth.startAutoRefresh();
  },

  stopAutoRefresh() {
    supabase.auth.stopAutoRefresh();
  },

  async verifyEmailCode(email, code) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (error) {
      throw mapSupabaseAuthFailure(error);
    }

    const session = toAuthSession(data.session);
    if (!session) {
      throw new AuthFailure('unexpected');
    }

    return session;
  },
};
