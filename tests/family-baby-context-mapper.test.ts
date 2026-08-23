import { describe, expect, it } from 'vitest';

import { mapFamilyBabyGroups } from '../src/features/family/infrastructure/family-baby-context-mapper';

describe('family baby context mapping', () => {
  it('separates followed, unfollowed and archived babies', () => {
    const groups = mapFamilyBabyGroups(
      [{ family_id: 'family-1', role: 'admin' }],
      [{ id: 'family-1', name: 'Casa Luna' }],
      [
        {
          family_id: 'family-1',
          id: 'baby-1',
          life_stage: 'born',
          name: 'Luna',
          photo_url: 'https://example.com/luna.jpg',
        },
        {
          family_id: 'family-1',
          id: 'baby-2',
          life_stage: 'expected',
          name: 'Nora',
        },
      ],
      [{ baby_id: 'baby-1' }],
      [
        {
          archived_at: '2026-08-02T10:00:00Z',
          baby_id: 'baby-3',
          baby_name: 'Leo',
          family_id: 'family-1',
        },
      ],
    );

    expect(groups[0]?.babies.map((baby) => baby.id)).toEqual(['baby-1']);
    expect(groups[0]?.babies[0]?.photoUrl).toBe('https://example.com/luna.jpg');
    expect(groups[0]?.unfollowedBabies.map((baby) => baby.id)).toEqual([
      'baby-2',
    ]);
    expect(groups[0]?.archivedBabies).toEqual([
      {
        archivedAt: '2026-08-02T10:00:00Z',
        id: 'baby-3',
        name: 'Leo',
      },
    ]);
  });
});
