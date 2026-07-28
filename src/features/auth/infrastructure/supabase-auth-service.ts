import type { AuthError, Session } from '@supabase/supabase-js';

import type { AuthService } from '@/features/auth/application/auth-service';
import {
  AuthFailure,
  type AuthFailureCode,
  type AuthSession,
} from '@/features/auth/domain/auth';
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

function mapFailure(error: AuthError): AuthFailure {
  const message = error.message.toLowerCase();
  let code: AuthFailureCode = 'unexpected';

  if (error.status === 429 || message.includes('rate limit')) {
    code = 'rate_limited';
  } else if (
    message.includes('token has expired') ||
    message.includes('token is invalid') ||
    message.includes('invalid token')
  ) {
    code = 'invalid_code';
  } else if (message.includes('fetch') || message.includes('network')) {
    code = 'network';
  }

  return new AuthFailure(code);
}

export const supabaseAuthService: AuthService = {
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw mapFailure(error);
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
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      throw mapFailure(error);
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      throw mapFailure(error);
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
      throw mapFailure(error);
    }

    const session = toAuthSession(data.session);
    if (!session) {
      throw new AuthFailure('unexpected');
    }

    return session;
  },
};
