import type { BabyProfile } from '@/features/baby-profile/domain/baby-profile';

export type BabyProfileField = keyof BabyProfile | 'birthMeasurement';

export interface BabyProfileValidationError {
  field: BabyProfileField;
  message: string;
}

function isIsoDate(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function validateBabyProfile(profile: BabyProfile): BabyProfileValidationError[] {
  const errors: BabyProfileValidationError[] = [];

  if (!profile.name.trim()) {
    errors.push({ field: 'name', message: 'Indica el nombre del bebé.' });
  }

  if (profile.lifeStage === 'expected' && !isIsoDate(profile.expectedDueDate)) {
    errors.push({
      field: 'expectedDueDate',
      message: 'Indica una fecha probable de parto válida.',
    });
  }

  if (profile.lifeStage === 'born' && !isIsoDate(profile.birthDate)) {
    errors.push({ field: 'birthDate', message: 'Indica una fecha de nacimiento válida.' });
  }

  if (
    profile.gestationalAgeWeeks !== undefined &&
    (profile.gestationalAgeWeeks < 20 || profile.gestationalAgeWeeks > 45)
  ) {
    errors.push({
      field: 'gestationalAgeWeeks',
      message: 'Revisa las semanas de gestación.',
    });
  }

  if (
    profile.gestationalAgeDays !== undefined &&
    (profile.gestationalAgeDays < 0 || profile.gestationalAgeDays > 6)
  ) {
    errors.push({
      field: 'gestationalAgeDays',
      message: 'Los días de gestación deben estar entre 0 y 6.',
    });
  }

  const measurement = profile.birthMeasurement;
  if (
    measurement?.weightGrams !== undefined &&
    (measurement.weightGrams < 300 || measurement.weightGrams > 7000)
  ) {
    errors.push({ field: 'birthMeasurement', message: 'Revisa el peso registrado.' });
  }

  return errors;
}
