import { describe, expect, it } from 'vitest';

import {
  resolveFamilyBabySelection,
  selectFamily,
} from '../src/features/family/application/family-baby-selection';
import type { FamilyBabyGroup } from '../src/features/family/domain/family-baby-context';

const families: FamilyBabyGroup[] = [
  {
    babies: [
      { id: 'baby-1', lifeStage: 'born', name: 'Luna' },
      { id: 'baby-2', lifeStage: 'expected', name: 'Nora' },
    ],
    id: 'family-1',
    name: 'Casa Luna',
    role: 'owner',
  },
  {
    babies: [{ id: 'baby-3', lifeStage: 'born', name: 'Leo' }],
    id: 'family-2',
    name: 'Casa Sol',
    role: 'caregiver',
  },
  {
    babies: [],
    id: 'family-3',
    name: 'Familia sin bebé',
    role: 'admin',
  },
];

describe('family and baby selection', () => {
  it('preserves a valid family and baby preference', () => {
    expect(
      resolveFamilyBabySelection(families, {
        babyId: 'baby-2',
        familyId: 'family-1',
      }),
    ).toEqual({
      babyId: 'baby-2',
      familyId: 'family-1',
    });
  });

  it('falls back without mixing babies from another family', () => {
    expect(
      resolveFamilyBabySelection(families, {
        babyId: 'baby-3',
        familyId: 'family-1',
      }),
    ).toEqual({
      babyId: 'baby-1',
      familyId: 'family-1',
    });
  });

  it('supports a selected family before its first baby is created', () => {
    expect(selectFamily(families, 'family-3')).toEqual({
      babyId: undefined,
      familyId: 'family-3',
    });
  });

  it('returns no selection when the user has no family', () => {
    expect(resolveFamilyBabySelection([])).toBeUndefined();
  });
});
