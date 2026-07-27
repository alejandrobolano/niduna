export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type BabyLifeStage = 'expected' | 'born';
type BloodGroup = 'A' | 'B' | 'AB' | 'O';
type FamilyRelationship =
  | 'mother'
  | 'father'
  | 'parent'
  | 'guardian'
  | 'grandparent'
  | 'relative'
  | 'professional_caregiver'
  | 'other';
type FamilyRole = 'owner' | 'admin' | 'caregiver' | 'viewer';
type RhesusFactor = 'positive' | 'negative';
type SexAtBirth = 'female' | 'male' | 'intersex' | 'unknown';

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          avatar_path: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        },
        {
          avatar_path?: string | null;
          display_name?: string | null;
          id: string;
        },
        {
          avatar_path?: string | null;
          display_name?: string | null;
        }
      >;
      families: Table<
        {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          updated_at: string;
        },
        {
          name: string;
        },
        {
          name?: string;
        }
      >;
      family_members: Table<
        {
          created_at: string;
          created_by: string;
          family_id: string;
          id: string;
          relationship: FamilyRelationship;
          role: FamilyRole;
          updated_at: string;
          user_id: string;
        },
        {
          created_by: string;
          family_id: string;
          relationship: FamilyRelationship;
          role: FamilyRole;
          user_id: string;
        },
        {
          relationship?: FamilyRelationship;
          role?: FamilyRole;
        }
      >;
      babies: Table<
        {
          birth_date: string | null;
          blood_group: BloodGroup | null;
          created_at: string;
          created_by: string;
          expected_due_date: string | null;
          family_id: string;
          gestational_days: number | null;
          gestational_weeks: number | null;
          id: string;
          life_stage: BabyLifeStage;
          name: string;
          notes: string | null;
          photo_path: string | null;
          rhesus_factor: RhesusFactor | null;
          sex_at_birth: SexAtBirth | null;
          updated_at: string;
        },
        {
          birth_date?: string | null;
          blood_group?: BloodGroup | null;
          expected_due_date?: string | null;
          family_id: string;
          gestational_days?: number | null;
          gestational_weeks?: number | null;
          life_stage: BabyLifeStage;
          name: string;
          notes?: string | null;
          photo_path?: string | null;
          rhesus_factor?: RhesusFactor | null;
          sex_at_birth?: SexAtBirth | null;
        },
        {
          birth_date?: string | null;
          blood_group?: BloodGroup | null;
          expected_due_date?: string | null;
          gestational_days?: number | null;
          gestational_weeks?: number | null;
          life_stage?: BabyLifeStage;
          name?: string;
          notes?: string | null;
          photo_path?: string | null;
          rhesus_factor?: RhesusFactor | null;
          sex_at_birth?: SexAtBirth | null;
        }
      >;
      baby_measurements: Table<
        {
          baby_id: string;
          created_at: string;
          head_circumference_millimeters: number | null;
          id: string;
          length_millimeters: number | null;
          measured_at: string;
          recorded_by: string;
          source: string | null;
          weight_grams: number | null;
        },
        {
          baby_id: string;
          head_circumference_millimeters?: number | null;
          length_millimeters?: number | null;
          measured_at: string;
          source?: string | null;
          weight_grams?: number | null;
        },
        {
          head_circumference_millimeters?: number | null;
          length_millimeters?: number | null;
          measured_at?: string;
          source?: string | null;
          weight_grams?: number | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      baby_life_stage: BabyLifeStage;
      blood_group: BloodGroup;
      family_relationship: FamilyRelationship;
      family_role: FamilyRole;
      rhesus_factor: RhesusFactor;
      sex_at_birth: SexAtBirth;
    };
    CompositeTypes: Record<string, never>;
  };
};
