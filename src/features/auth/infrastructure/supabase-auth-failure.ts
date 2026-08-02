import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

import { AuthFailure, type AuthFailureCode } from '../domain/auth';

const invalidCodeErrors = new Set([
  'bad_code_verifier',
  'otp_expired',
]);

const rateLimitErrors = new Set([
  'over_email_send_rate_limit',
  'over_request_rate_limit',
  'over_sms_send_rate_limit',
]);

function getFailureCode(error: unknown): AuthFailureCode {
  if (isAuthRetryableFetchError(error)) {
    return error.status === 0 ? 'network' : 'service_unavailable';
  }

  if (isAuthError(error)) {
    if (error.status === 429 || (error.code && rateLimitErrors.has(error.code))) {
      return 'rate_limited';
    }

    if (error.code && invalidCodeErrors.has(error.code)) {
      return 'invalid_code';
    }
  }

  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    if (message.includes('fetch') || message.includes('network')) {
      return 'network';
    }
  }

  return 'unexpected';
}

export function mapSupabaseAuthFailure(error: unknown): AuthFailure {
  if (typeof __DEV__ !== 'undefined' && __DEV__ && isAuthError(error)) {
    console.warn('Supabase Auth request failed', {
      code: error.code,
      name: error.name,
      status: error.status,
    });
  }

  return new AuthFailure(getFailureCode(error));
}
