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
type BreastSide = 'left' | 'right' | 'both';
type CareEventType = 'feeding' | 'diaper' | 'sleep';
type DiaperCondition = 'wet' | 'dirty' | 'both';
type FeedingMethod = 'breast' | 'expressed_milk' | 'formula' | 'mixed';
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
      family_invitations: Table<
        {
          accepted_at: string | null;
          accepted_by: string | null;
          code_hash: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          family_id: string;
          id: string;
          revoked_at: string | null;
          role: Exclude<FamilyRole, 'owner'>;
        },
        {
          code_hash: string;
          expires_at: string;
          family_id: string;
          role: Exclude<FamilyRole, 'owner'>;
        },
        {
          revoked_at?: string | null;
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
      care_events: Table<
        {
          amount_milliliters: number | null;
          baby_id: string;
          breast_side: BreastSide | null;
          created_at: string;
          diaper_condition: DiaperCondition | null;
          ended_at: string | null;
          event_type: CareEventType;
          feeding_method: FeedingMethod | null;
          id: string;
          notes: string | null;
          occurred_at: string;
          recorded_by: string;
          updated_at: string;
          updated_by: string;
        },
        {
          amount_milliliters?: number | null;
          baby_id: string;
          breast_side?: BreastSide | null;
          diaper_condition?: DiaperCondition | null;
          ended_at?: string | null;
          event_type: CareEventType;
          feeding_method?: FeedingMethod | null;
          notes?: string | null;
          occurred_at?: string;
        },
        {
          ended_at?: string | null;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      accept_family_invitation: {
        Args: {
          target_code: string;
          target_display_name: string;
          target_relationship: FamilyRelationship;
        };
        Returns: string;
      };
      create_family: {
        Args: {
          target_display_name: string;
          target_name: string;
          target_relationship: FamilyRelationship;
        };
        Returns: string;
      };
      create_family_invitation: {
        Args: {
          target_family_id: string;
          target_role: Exclude<FamilyRole, 'owner'>;
          validity_hours?: number;
        };
        Returns: {
          invitation_code: string;
          invitation_expires_at: string;
          invitation_id: string;
        }[];
      };
      revoke_family_invitation: {
        Args: {
          target_invitation_id: string;
        };
        Returns: undefined;
      };
      update_my_family_identity: {
        Args: {
          target_display_name: string;
          target_family_id: string;
          target_relationship: FamilyRelationship;
        };
        Returns: undefined;
      };
      save_baby_profile: {
        Args: {
          target_baby_id: string | null;
          target_family_id: string;
          target_birth_date: string | null;
          target_blood_group: BloodGroup | null;
          target_expected_due_date: string | null;
          target_gestational_days: number | null;
          target_gestational_weeks: number | null;
          target_head_circumference_millimeters: number | null;
          target_length_millimeters: number | null;
          target_life_stage: BabyLifeStage;
          target_name: string;
          target_notes: string | null;
          target_rhesus_factor: RhesusFactor | null;
          target_sex_at_birth: SexAtBirth | null;
          target_weight_grams: number | null;
        };
        Returns: string;
      };
    };
    Enums: {
      baby_life_stage: BabyLifeStage;
      blood_group: BloodGroup;
      breast_side: BreastSide;
      care_event_type: CareEventType;
      diaper_condition: DiaperCondition;
      family_relationship: FamilyRelationship;
      family_role: FamilyRole;
      feeding_method: FeedingMethod;
      rhesus_factor: RhesusFactor;
      sex_at_birth: SexAtBirth;
    };
    CompositeTypes: Record<string, never>;
  };
};
