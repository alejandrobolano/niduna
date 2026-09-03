import { describe, expect, it } from 'vitest';

import {
  canAccessCare,
  resolveAccessibleAppSection,
} from '../src/features/home/domain/app-section-access';

describe('app section access', () => {
  it('hides handoff and care history while the active baby is expected', () => {
    expect(canAccessCare('expected')).toBe(false);
    expect(resolveAccessibleAppSection('handoff', 'expected')).toBe('baby');
    expect(resolveAccessibleAppSection('history', 'expected')).toBe('baby');
    expect(resolveAccessibleAppSection('summary', 'expected')).toBe('baby');
  });

  it('hides handoff and care history when the family has no active baby', () => {
    expect(canAccessCare(undefined)).toBe(false);
    expect(resolveAccessibleAppSection('handoff', undefined)).toBe('baby');
    expect(resolveAccessibleAppSection('history', undefined)).toBe('baby');
  });

  it('allows care sections as soon as the active baby is born', () => {
    expect(canAccessCare('born')).toBe(true);
    expect(resolveAccessibleAppSection('handoff', 'born')).toBe('handoff');
    expect(resolveAccessibleAppSection('history', 'born')).toBe('history');
    expect(resolveAccessibleAppSection('summary', 'born')).toBe('summary');
  });

  it('keeps prenatal profile and family sections available', () => {
    expect(resolveAccessibleAppSection('baby', 'expected')).toBe('baby');
    expect(resolveAccessibleAppSection('family', 'expected')).toBe('family');
  });
});
