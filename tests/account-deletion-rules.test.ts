import { describe, expect, it } from 'vitest';

import {
  chunkValues,
  hasRecentOtpAuthentication,
  parseDeleteAccountRequest,
} from '../supabase/functions/_shared/account-deletion-rules';

describe('account deletion authentication rules', () => {
  const now = 1_800_000_000;

  it('accepts a recent OTP verification', () => {
    expect(
      hasRecentOtpAuthentication(
        [{ method: 'otp', timestamp: now - 60 }],
        now,
        600,
      ),
    ).toBe(true);
  });

  it('rejects an expired OTP verification', () => {
    expect(
      hasRecentOtpAuthentication(
        [{ method: 'otp', timestamp: now - 601 }],
        now,
        600,
      ),
    ).toBe(false);
  });

  it('does not treat a recent token refresh as identity verification', () => {
    expect(
      hasRecentOtpAuthentication(
        [{ method: 'token_refresh', timestamp: now }],
        now,
        600,
      ),
    ).toBe(false);
  });
});

describe('account deletion request rules', () => {
  it('defaults to preserving owned families', () => {
    expect(parseDeleteAccountRequest({})).toEqual({ deleteOwnedFamilies: false });
  });

  it('accepts an explicit full deletion request', () => {
    expect(parseDeleteAccountRequest({ deleteOwnedFamilies: true })).toEqual({
      deleteOwnedFamilies: true,
    });
  });

  it('rejects unknown or invalid fields', () => {
    expect(parseDeleteAccountRequest({ deleteOwnedFamilies: 'yes' })).toBeUndefined();
    expect(parseDeleteAccountRequest({ deleteOwnedFamilies: true, familyId: 'unsafe' })).toBeUndefined();
  });

  it('chunks storage paths within the API limit', () => {
    expect(chunkValues(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']]);
  });
});
