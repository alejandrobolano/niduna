import { describe, expect, it } from 'vitest';

import { canWriteFamilyResources } from './family';

describe('canWriteFamilyResources', () => {
  it.each(['owner', 'admin', 'caregiver'] as const)(
    'allows %s to write shared resources',
    (role) => {
      expect(canWriteFamilyResources(role)).toBe(true);
    },
  );

  it('keeps viewers read-only', () => {
    expect(canWriteFamilyResources('viewer')).toBe(false);
  });
});
