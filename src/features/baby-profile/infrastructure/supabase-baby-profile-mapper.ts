import type { StoredBabyProfile } from '@/features/baby-profile/application/baby-profile-repository';
import type { BabyProfile } from '@/features/baby-profile/domain/baby-profile';
import type { Database } from '@/shared/infrastructure/supabase/database.types';

type BabyRow = Database['public']['Tables']['babies']['Row'];
type MeasurementRow = Database['public']['Tables']['baby_measurements']['Row'];

function centimetersToMillimeters(value: number | undefined): number | null {
  return value === undefined ? null : Math.round(value * 10);
}

function millimetersToCentimeters(value: number | null): number | undefined {
  return value === null ? undefined : value / 10;
}

export function mapStoredProfile(
  baby: BabyRow,
  birthMeasurement: MeasurementRow | null,
): StoredBabyProfile {
  const measurement =
    birthMeasurement &&
    (birthMeasurement.weight_grams !== null ||
      birthMeasurement.length_millimeters !== null ||
      birthMeasurement.head_circumference_millimeters !== null)
      ? {
          weightGrams: birthMeasurement.weight_grams ?? undefined,
          lengthCentimeters: millimetersToCentimeters(
            birthMeasurement.length_millimeters,
          ),
          headCircumferenceCentimeters: millimetersToCentimeters(
            birthMeasurement.head_circumference_millimeters,
          ),
        }
      : undefined;

  return {
    id: baby.id,
    profile: {
      birthDate: baby.birth_date ?? undefined,
      birthMeasurement: measurement,
      bloodGroup: baby.blood_group ?? undefined,
      expectedDueDate: baby.expected_due_date ?? undefined,
      gestationalAgeDays: baby.gestational_days ?? undefined,
      gestationalAgeWeeks: baby.gestational_weeks ?? undefined,
      lifeStage: baby.life_stage,
      name: baby.name,
      notes: baby.notes ?? undefined,
      rhesusFactor: baby.rhesus_factor ?? undefined,
      sexAtBirth: baby.sex_at_birth ?? undefined,
    },
  };
}

export function toRpcArguments(
  familyId: string,
  babyId: string | undefined,
  profile: BabyProfile,
) {
  const measurement = profile.birthMeasurement;

  return {
    target_baby_id: babyId ?? null,
    target_family_id: familyId,
    target_birth_date: profile.birthDate ?? null,
    target_blood_group:
      profile.bloodGroup && profile.bloodGroup !== 'unknown'
        ? profile.bloodGroup
        : null,
    target_expected_due_date: profile.expectedDueDate ?? null,
    target_gestational_days: profile.gestationalAgeDays ?? null,
    target_gestational_weeks: profile.gestationalAgeWeeks ?? null,
    target_head_circumference_millimeters: centimetersToMillimeters(
      measurement?.headCircumferenceCentimeters,
    ),
    target_length_millimeters: centimetersToMillimeters(
      measurement?.lengthCentimeters,
    ),
    target_life_stage: profile.lifeStage,
    target_name: profile.name.trim(),
    target_notes: profile.notes ?? null,
    target_rhesus_factor:
      profile.rhesusFactor && profile.rhesusFactor !== 'unknown'
        ? profile.rhesusFactor
        : null,
    target_sex_at_birth: profile.sexAtBirth ?? null,
    target_weight_grams:
      measurement?.weightGrams === undefined
        ? null
        : Math.round(measurement.weightGrams),
  };
}
