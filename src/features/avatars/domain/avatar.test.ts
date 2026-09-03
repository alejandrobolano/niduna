import { describe, expect, it } from 'vitest';

import {
  babyAvatarVariants,
  getDefaultBabyAvatar,
  getDefaultMemberAvatar,
  memberAvatarVariants,
  resolveBabyAvatar,
  resolveMemberAvatar,
} from './avatar';

describe('avatar assignment', () => {
  it('uses the relationship default unless a member chooses another animal', () => {
    expect(getDefaultMemberAvatar('mother')).toBe('rabbit');
    expect(getDefaultMemberAvatar('father')).toBe('bear');
    expect(resolveMemberAvatar('koala', 'mother')).toBe('koala');
    expect(memberAvatarVariants).toContain(resolveMemberAvatar(undefined, 'relative'));
  });

  it('uses the sex default unless the family chooses another baby animal', () => {
    expect(getDefaultBabyAvatar('female')).toBe('lamb');
    expect(getDefaultBabyAvatar('male')).toBe('chick');
    expect(resolveBabyAvatar('seal', 'female')).toBe('seal');
    expect(babyAvatarVariants).toContain(resolveBabyAvatar(undefined, 'unknown'));
  });
});
