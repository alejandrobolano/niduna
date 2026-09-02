import { describe, expect, it } from 'vitest';

import { canManageBabyContact } from './baby-contact-permissions';

describe('canManageBabyContact', () => {
  it('allows the author, owner and administrator', () => {
    expect(canManageBabyContact('user-1', 'user-1', 'viewer')).toBe(true);
    expect(canManageBabyContact('user-2', 'user-1', 'owner')).toBe(true);
    expect(canManageBabyContact('user-2', 'user-1', 'admin')).toBe(true);
  });

  it('keeps other family members read only', () => {
    expect(canManageBabyContact('user-2', 'user-1', 'caregiver')).toBe(false);
    expect(canManageBabyContact(undefined, 'user-1', 'viewer')).toBe(false);
  });
});
