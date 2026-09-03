import { describe, expect, it } from 'vitest';

import {
  babyAvatarVariants,
  memberAvatarVariants,
  resolveBabyAvatar,
  resolveMemberAvatar,
} from './avatar';

describe('avatar assignment', () => {
  it('keeps a member avatar stable', () => {
    expect(resolveMemberAvatar('member-123')).toBe(resolveMemberAvatar('member-123'));
    expect(memberAvatarVariants).toContain(resolveMemberAvatar('member-123'));
  });

  it('keeps a baby avatar stable', () => {
    expect(resolveBabyAvatar('baby-123')).toBe(resolveBabyAvatar('baby-123'));
    expect(babyAvatarVariants).toContain(resolveBabyAvatar('baby-123'));
  });
});
