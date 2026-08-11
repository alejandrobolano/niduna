import { describe, expect, it } from 'vitest';

import {
  mapStoredProfile,
  toRpcArguments,
} from '../src/features/baby-profile/infrastructure/supabase-baby-profile-mapper';

describe('Supabase baby profile mapping', () => {
  it('maps stored birth measurements to domain units', () => {
    const stored = mapStoredProfile(
      {
        archived_at: null,
        archived_by: null,
        birth_date: '2026-07-29',
        blood_group: 'O',
        created_at: '2026-07-29T12:00:00Z',
        created_by: 'user-id',
        expected_due_date: null,
        family_id: 'family-id',
        gestational_days: 2,
        gestational_weeks: 39,
        id: 'baby-id',
        life_stage: 'born',
        name: 'Lucía',
        notes: null,
        photo_path: null,
        rhesus_factor: 'negative',
        sex_at_birth: 'female',
        updated_at: '2026-07-29T12:00:00Z',
      },
      {
        baby_id: 'baby-id',
        created_at: '2026-07-29T12:00:00Z',
        deleted_at: null,
        deleted_by: null,
        head_circumference_millimeters: 350,
        id: 'measurement-id',
        length_millimeters: 505,
        measured_at: '2026-07-29T00:00:00Z',
        notes: null,
        recorded_by: 'user-id',
        source: 'birth',
        updated_at: '2026-07-29T12:00:00Z',
        updated_by: 'user-id',
        weight_grams: 3250,
      },
    );

    expect(stored.profile.birthMeasurement).toEqual({
      headCircumferenceCentimeters: 35,
      lengthCentimeters: 50.5,
      weightGrams: 3250,
    });
    expect(stored.profile.bloodGroup).toBe('O');
    expect(stored.profile.rhesusFactor).toBe('negative');
  });

  it('maps domain values to the atomic save operation', () => {
    expect(
      toRpcArguments('family-id', undefined, {
        birthDate: '2026-07-29',
        birthMeasurement: {
          headCircumferenceCentimeters: 35.2,
          lengthCentimeters: 50.5,
          weightGrams: 3250,
        },
        bloodGroup: 'unknown',
        lifeStage: 'born',
        name: ' Lucía ',
        rhesusFactor: 'unknown',
        sexAtBirth: 'female',
      }),
    ).toMatchObject({
      target_baby_id: null,
      target_family_id: 'family-id',
      target_head_circumference_millimeters: 352,
      target_length_millimeters: 505,
      target_name: 'Lucía',
      target_blood_group: null,
      target_rhesus_factor: null,
      target_weight_grams: 3250,
    });
  });
});
