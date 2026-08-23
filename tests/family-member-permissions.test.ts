import { describe, expect, it } from 'vitest';

import {
  canRenameFamily,
  canRemoveFamilyMember,
  canTransferFamilyOwnership,
} from '../src/features/family/application/family-member-permissions';

describe('family name permissions', () => {
  it('allows only the owner to rename the family', () => {
    expect(canRenameFamily('owner')).toBe(true);
    expect(canRenameFamily('admin')).toBe(false);
    expect(canRenameFamily('caregiver')).toBe(false);
    expect(canRenameFamily('viewer')).toBe(false);
  });
});

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

describe('family ownership transfer permissions', () => {
  it('allows owners to choose another existing member', () => {
    expect(
      canTransferFamilyOwnership('owner', {
        isCurrentUser: false,
        role: 'viewer',
      }),
    ).toBe(true);
  });

  it('rejects self transfer and non-owner actors', () => {
    expect(
      canTransferFamilyOwnership('owner', {
        isCurrentUser: true,
        role: 'owner',
      }),
    ).toBe(false);
    expect(
      canTransferFamilyOwnership('admin', {
        isCurrentUser: false,
        role: 'caregiver',
      }),
    ).toBe(false);
  });
});
