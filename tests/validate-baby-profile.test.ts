import { describe, expect, it } from 'vitest';

import { validateBabyProfile } from '../src/features/baby-profile/application/validate-baby-profile';

describe('validateBabyProfile', () => {
  it('requires a name', () => {
    const errors = validateBabyProfile({
      lifeStage: 'expected',
      name: '',
      expectedDueDate: '2026-08-21',
    });

    expect(errors).toContainEqual({
      field: 'name',
      message: 'Indica el nombre del bebé.',
    });
  });

  it('accepts an expected baby profile', () => {
    const errors = validateBabyProfile({
      lifeStage: 'expected',
      name: 'Lucía',
      expectedDueDate: '2026-08-21',
    });

    expect(errors).toEqual([]);
  });

  it('requires a birth date for a born baby', () => {
    const errors = validateBabyProfile({
      lifeStage: 'born',
      name: 'Lucía',
    });

    expect(errors).toContainEqual({
      field: 'birthDate',
      message: 'Indica una fecha de nacimiento válida.',
    });
  });

  it('rejects invalid birth measurements before persistence', () => {
    const errors = validateBabyProfile({
      birthDate: '2026-07-29',
      birthMeasurement: {
        headCircumferenceCentimeters: 90,
        lengthCentimeters: 10,
        weightGrams: 100,
      },
      lifeStage: 'born',
      name: 'Lucía',
    });

    expect(errors.filter((error) => error.field === 'birthMeasurement')).toHaveLength(3);
  });
});
