import { describe, expect, it } from 'vitest';

import { canCreateBabyContact, canManageBabyContact } from './baby-contact-permissions';

describe('canManageBabyContact', () => {
  it('allows the author, owner and administrator when they can write', () => {
    expect(canManageBabyContact('user-1', 'user-1', 'caregiver')).toBe(true);
    expect(canManageBabyContact('user-2', 'user-1', 'owner')).toBe(true);
    expect(canManageBabyContact('user-2', 'user-1', 'admin')).toBe(true);
  });

  it('keeps viewers from creating or changing contacts', () => {
    expect(canCreateBabyContact('viewer')).toBe(false);
    expect(canCreateBabyContact('caregiver')).toBe(true);
    expect(canManageBabyContact('user-1', 'user-1', 'viewer')).toBe(false);
  });

  it('keeps other family members read only', () => {
    expect(canManageBabyContact('user-2', 'user-1', 'caregiver')).toBe(false);
    expect(canManageBabyContact(undefined, 'user-1', 'viewer')).toBe(false);
  });
});
