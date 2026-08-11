export type BabyLifeStage = 'expected' | 'born';

export type SexAtBirth = 'female' | 'male' | 'intersex' | 'unknown';

export type BloodGroup = 'A' | 'B' | 'AB' | 'O' | 'unknown';

export type RhesusFactor = 'positive' | 'negative' | 'unknown';

export interface BirthMeasurement {
  weightGrams?: number;
  lengthCentimeters?: number;
  headCircumferenceCentimeters?: number;
}

export interface BabyProfile {
  lifeStage: BabyLifeStage;
  name: string;
  expectedDueDate?: string;
  birthDate?: string;
  sexAtBirth?: SexAtBirth;
  bloodGroup?: BloodGroup;
  rhesusFactor?: RhesusFactor;
  gestationalAgeWeeks?: number;
  gestationalAgeDays?: number;
  birthMeasurement?: BirthMeasurement;
  notes?: string;
}
