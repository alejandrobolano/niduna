import { describe, expect, it } from 'vitest';

import {
  customMedicationUnit,
  getMedicationUnitSelection,
  resolveMedicationUnit,
} from '../domain/medication-unit';

describe('medication unit selection', () => {
  it('keeps a supported unit as a preset', () => {
    expect(getMedicationUnitSelection('ml')).toEqual({
      customValue: '',
      preset: 'ml',
    });
  });

  it('preserves legacy and custom units', () => {
    expect(getMedicationUnitSelection('aplicaciones')).toEqual({
      customValue: 'aplicaciones',
      preset: customMedicationUnit,
    });
  });

  it('resolves and trims a custom unit', () => {
    expect(resolveMedicationUnit(customMedicationUnit, ' sobres ')).toBe('sobres');
  });
});
