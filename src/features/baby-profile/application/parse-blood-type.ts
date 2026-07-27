import type {
  BloodGroup,
  RhesusFactor,
} from '@/features/baby-profile/domain/baby-profile';

export type BloodTypeSelection =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-'
  | 'unknown';

const bloodGroupByType: Record<
  Exclude<BloodTypeSelection, 'unknown'>,
  Exclude<BloodGroup, 'unknown'>
> = {
  'A+': 'A',
  'A-': 'A',
  'B+': 'B',
  'B-': 'B',
  'AB+': 'AB',
  'AB-': 'AB',
  'O+': 'O',
  'O-': 'O',
};

export function parseBloodType(value: BloodTypeSelection | undefined): {
  bloodGroup?: BloodGroup;
  rhesusFactor?: RhesusFactor;
} {
  if (!value) {
    return {};
  }

  if (value === 'unknown') {
    return { bloodGroup: 'unknown', rhesusFactor: 'unknown' };
  }

  return {
    bloodGroup: bloodGroupByType[value],
    rhesusFactor: value.endsWith('+') ? 'positive' : 'negative',
  };
}
