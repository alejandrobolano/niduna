import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { mapSupabaseAuthFailure } from '../src/features/auth/infrastructure/supabase-auth-failure';

describe('Supabase authentication failures', () => {
  it('maps a native transport failure to a network error', () => {
    const failure = mapSupabaseAuthFailure(
      new AuthRetryableFetchError('Network request failed', 0),
    );

    expect(failure.code).toBe('network');
  });

  it('maps a retryable server response separately from device connectivity', () => {
    const failure = mapSupabaseAuthFailure(
      new AuthRetryableFetchError('Service unavailable', 503),
    );

    expect(failure.code).toBe('service_unavailable');
  });

  it('uses the stable Supabase code for expired OTPs', () => {
    const failure = mapSupabaseAuthFailure(
      new AuthApiError('Email link is invalid or has expired', 403, 'otp_expired'),
    );

    expect(failure.code).toBe('invalid_code');
  });

  it('maps email rate limits without depending on message text', () => {
    const failure = mapSupabaseAuthFailure(
      new AuthApiError('Request blocked', 429, 'over_email_send_rate_limit'),
    );

    expect(failure.code).toBe('rate_limited');
  });
});
