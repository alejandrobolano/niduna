import { describe, expect, it } from 'vitest';

import { canRemoveFamilyMember } from '../src/features/family/application/family-member-permissions';

describe('family member removal permissions', () => {
  it('allows owners to remove administrators and regular members', () => {
    expect(
      canRemoveFamilyMember('owner', { isCurrentUser: false, role: 'admin' }),
    ).toBe(true);
    expect(
      canRemoveFamilyMember('owner', {
        isCurrentUser: false,
        role: 'caregiver',
      }),
    ).toBe(true);
  });

  it('allows administrators to remove only regular members', () => {
    expect(
      canRemoveFamilyMember('admin', {
        isCurrentUser: false,
        role: 'viewer',
      }),
    ).toBe(true);
    expect(
      canRemoveFamilyMember('admin', { isCurrentUser: false, role: 'admin' }),
    ).toBe(false);
  });

  it('never allows self removal or owner removal', () => {
    expect(
      canRemoveFamilyMember('owner', { isCurrentUser: true, role: 'admin' }),
    ).toBe(false);
    expect(
      canRemoveFamilyMember('owner', { isCurrentUser: false, role: 'owner' }),
    ).toBe(false);
  });
});
