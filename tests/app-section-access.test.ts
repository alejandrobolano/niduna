import { describe, expect, it } from 'vitest';

import {
  canAccessCareHistory,
  resolveAccessibleAppSection,
} from '../src/features/home/domain/app-section-access';

describe('app section access', () => {
  it('hides care history while the active baby is expected', () => {
    expect(canAccessCareHistory('expected')).toBe(false);
    expect(resolveAccessibleAppSection('history', 'expected')).toBe('handoff');
    expect(resolveAccessibleAppSection('summary', 'expected')).toBe('handoff');
  });

  it('allows care history as soon as the active baby is born', () => {
    expect(canAccessCareHistory('born')).toBe(true);
    expect(resolveAccessibleAppSection('history', 'born')).toBe('history');
    expect(resolveAccessibleAppSection('summary', 'born')).toBe('summary');
  });

  it('keeps prenatal profile and family sections available', () => {
    expect(resolveAccessibleAppSection('baby', 'expected')).toBe('baby');
    expect(resolveAccessibleAppSection('family', 'expected')).toBe('family');
    expect(resolveAccessibleAppSection('handoff', 'expected')).toBe('handoff');
  });
});
