import { describe, expect, it } from 'vitest';

import {
  formatInvitationCode,
  isInvitationCodeComplete,
  normalizeInvitationCode,
} from '../src/features/family/application/invitation-code';

describe('family invitation codes', () => {
  it('normalizes pasted and typed codes consistently', () => {
    expect(normalizeInvitationCode(' abcd-1234 ef56-7890 ')).toBe(
      'ABCD1234EF567890',
    );
  });

  it('formats complete codes in readable groups', () => {
    expect(formatInvitationCode('abcd1234ef567890')).toBe(
      'ABCD-1234-EF56-7890',
    );
  });

  it('rejects incomplete or non-hexadecimal codes', () => {
    expect(isInvitationCodeComplete('ABCD-1234')).toBe(false);
    expect(isInvitationCodeComplete('ABCD-1234-EF56-78XZ')).toBe(false);
    expect(isInvitationCodeComplete('ABCD-1234-EF56-7890')).toBe(true);
  });
});
