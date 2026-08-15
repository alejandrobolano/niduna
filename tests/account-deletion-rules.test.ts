import { describe, expect, it } from 'vitest';

import {
  chunkValues,
  parseDeleteAccountRequest,
} from '../supabase/functions/_shared/account-deletion-rules';

describe('account deletion request rules', () => {
  it('defaults to preserving owned families', () => {
    expect(parseDeleteAccountRequest({ confirmation: 'ELIMINAR' })).toEqual({
      confirmation: 'ELIMINAR',
      deleteOwnedFamilies: false,
    });
  });

  it('accepts an explicit full deletion request', () => {
    expect(parseDeleteAccountRequest({
      confirmation: 'ELIMINAR',
      deleteOwnedFamilies: true,
    })).toEqual({
      confirmation: 'ELIMINAR',
      deleteOwnedFamilies: true,
    });
  });

  it('rejects unknown or invalid fields', () => {
    expect(parseDeleteAccountRequest({ confirmation: 'eliminar' })).toBeUndefined();
    expect(parseDeleteAccountRequest({
      confirmation: 'ELIMINAR',
      deleteOwnedFamilies: 'yes',
    })).toBeUndefined();
    expect(parseDeleteAccountRequest({
      confirmation: 'ELIMINAR',
      deleteOwnedFamilies: true,
      familyId: 'unsafe',
    })).toBeUndefined();
  });

  it('chunks storage paths within the API limit', () => {
    expect(chunkValues(['a', 'b', 'c'], 2)).toEqual([['a', 'b'], ['c']]);
  });
});
