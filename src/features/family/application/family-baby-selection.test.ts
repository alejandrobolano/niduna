import { describe, expect, it } from 'vitest';

import type { FamilyBabyGroup } from '@/features/family/domain/family-baby-context';

import { selectBaby } from './family-baby-selection';

function createFamily(id: string, babyId: string): FamilyBabyGroup {
  return {
    archivedBabies: [],
    babies: [
      {
        id: babyId,
        lifeStage: 'born',
        name: babyId,
      },
    ],
    id,
    name: id,
    role: 'caregiver',
    unfollowedBabies: [],
  };
}

describe('family baby selection', () => {
  it('selects a baby from a family other than the active family', () => {
    expect(
      selectBaby(
        [createFamily('family-1', 'baby-1'), createFamily('family-2', 'baby-2')],
        'baby-2',
      ),
    ).toEqual({ babyId: 'baby-2', familyId: 'family-2' });
  });

  it('does not create a selection for an inaccessible baby', () => {
    expect(selectBaby([createFamily('family-1', 'baby-1')], 'unknown')).toBeUndefined();
  });
});
