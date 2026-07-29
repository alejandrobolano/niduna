import { describe, expect, it } from 'vitest';

import { mapFamilies } from '../src/features/family/infrastructure/supabase-family-mapper';

describe('Supabase family mapping', () => {
  it('combines family, member, profile and invitation rows', () => {
    const families = mapFamilies(
      [{ created_at: '2026-07-29T12:00:00Z', id: 'family-id', name: 'Casa Luna' }],
      [
        {
          family_id: 'family-id',
          id: 'member-1',
          relationship: 'father',
          role: 'owner',
          user_id: 'user-1',
        },
        {
          family_id: 'family-id',
          id: 'member-2',
          relationship: 'mother',
          role: 'admin',
          user_id: 'user-2',
        },
      ],
      [
        { display_name: 'Alejandro', id: 'user-1' },
        { display_name: 'Lucía', id: 'user-2' },
      ],
      [
        {
          created_at: '2026-07-29T12:00:00Z',
          expires_at: '2026-07-31T12:00:00Z',
          family_id: 'family-id',
          id: 'invitation-id',
          role: 'caregiver',
        },
      ],
      'user-1',
    );

    expect(families).toHaveLength(1);
    expect(families[0]).toMatchObject({
      currentUserRelationship: 'father',
      currentUserRole: 'owner',
      name: 'Casa Luna',
    });
    expect(families[0]?.members[1]).toMatchObject({
      displayName: 'Lucía',
      isCurrentUser: false,
      role: 'admin',
    });
    expect(families[0]?.invitations[0]?.role).toBe('caregiver');
  });

  it('omits families without a current-user membership', () => {
    expect(
      mapFamilies(
        [{ created_at: '2026-07-29T12:00:00Z', id: 'family-id', name: 'Otra' }],
        [],
        [],
        [],
        'user-1',
      ),
    ).toEqual([]);
  });
});
