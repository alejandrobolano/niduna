import { describe, expect, it } from 'vitest';

import {
  canAccessCare,
  canAccessHandoff,
  resolveAccessibleAppSection,
} from './app-section-access';

describe('app section access', () => {
  it('keeps prenatal coordination available before birth', () => {
    expect(canAccessHandoff('expected')).toBe(true);
    expect(canAccessCare('expected')).toBe(false);
  });

  it('redirects postnatal sections before birth', () => {
    expect(resolveAccessibleAppSection('history', 'expected')).toBe('baby');
    expect(resolveAccessibleAppSection('medications', 'expected')).toBe('baby');
    expect(resolveAccessibleAppSection('summary', 'expected')).toBe('baby');
  });

  it('allows medication tracking after birth', () => {
    expect(resolveAccessibleAppSection('medications', 'born')).toBe(
      'medications',
    );
  });
});
