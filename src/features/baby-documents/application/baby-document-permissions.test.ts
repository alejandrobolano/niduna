import { describe, expect, it } from 'vitest';

import { canCreateBabyDocument, canManageBabyDocument } from './baby-document-permissions';

describe('canManageBabyDocument', () => {
  it('keeps viewers from creating documents', () => {
    expect(canCreateBabyDocument('viewer')).toBe(false);
    expect(canCreateBabyDocument('caregiver')).toBe(true);
  });

  it.each(['owner', 'admin'] as const)('allows %s to manage any document', (role) => {
    expect(canManageBabyDocument(role, 'user-a', { authorUserId: 'user-b' })).toBe(true);
  });

  it('allows an author to manage their own document', () => {
    expect(canManageBabyDocument('caregiver', 'user-a', { authorUserId: 'user-a' })).toBe(true);
  });

  it('prevents other members from changing the document', () => {
    expect(canManageBabyDocument('viewer', 'user-a', { authorUserId: 'user-b' })).toBe(false);
  });

  it('keeps viewers from changing documents they previously authored', () => {
    expect(canManageBabyDocument('viewer', 'user-a', { authorUserId: 'user-a' })).toBe(false);
  });
});
