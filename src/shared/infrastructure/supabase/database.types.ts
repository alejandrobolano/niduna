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
      baby_followers: Table<
        {
          baby_id: string;
          created_at: string;
          family_id: string;
          user_id: string;
        },
        {
          baby_id: string;
          family_id: string;
          user_id: string;
        },
        Record<string, never>
      >;
      push_devices: Table<
        {
          created_at: string;
          expo_push_token: string;
          id: string;
          is_active: boolean;
          last_registered_at: string;
          platform: 'android' | 'ios';
          updated_at: string;
          user_id: string;
        },
        {
          expo_push_token: string;
          platform: 'android' | 'ios';
          user_id: string;
        },
        {
          is_active?: boolean;
          last_registered_at?: string;
          platform?: 'android' | 'ios';
          user_id?: string;
        }
      >;
      web_push_devices: Table<
        {
          created_at: string;
          firebase_installation_id: string;
          id: string;
          is_active: boolean;
          last_registered_at: string;
          updated_at: string;
          user_id: string;
        },
        {
          firebase_installation_id: string;
          user_id: string;
        },
        {
          firebase_installation_id?: string;
          is_active?: boolean;
          last_registered_at?: string;
          user_id?: string;
        }
      >;
      web_notification_deliveries: Table<
        {
          care_event_id: string;
          created_at: string;
          error_code: string | null;
          fcm_message_id: string | null;
          id: string;
          status: 'pending' | 'sent' | 'failed';
          updated_at: string;
          web_push_device_id: string;
        },
        {
          care_event_id: string;
          web_push_device_id: string;
        },
        {
          error_code?: string | null;
          fcm_message_id?: string | null;
          status?: 'pending' | 'sent' | 'failed';
        }
      >;
      family_activity_notification_deliveries: Table<
        {
          channel: 'native' | 'web';
          created_at: string;
          device_id: string;
          error_code: string | null;
          id: string;
          provider_message_id: string | null;
          source_id: string;
          source_type: 'note' | 'measurement';
          status: 'pending' | 'sent' | 'delivered' | 'failed';
          updated_at: string;
        },
        {
          channel: 'native' | 'web';
          device_id: string;
          source_id: string;
          source_type: 'note' | 'measurement';
        },
        {
          error_code?: string | null;
          provider_message_id?: string | null;
          status?: 'pending' | 'sent' | 'delivered' | 'failed';
        }
      >;
      app_releases: Table<
        {
          app_build_version: string;
          app_version: string;
          artifact_url: string;
          build_details_url: string;
          build_profile: string;
          completed_at: string;
          created_at: string;
          distribution: string;
          eas_build_id: string;
          git_commit_hash: string | null;
          platform: 'android' | 'ios';
        },
        {
          app_build_version: string;
          app_version: string;
          artifact_url: string;
          build_details_url: string;
          build_profile: string;
          completed_at: string;
          distribution: string;
          eas_build_id: string;
          git_commit_hash?: string | null;
          platform: 'android' | 'ios';
        },
        {
          app_build_version?: string;
          app_version?: string;
          artifact_url?: string;
          build_details_url?: string;
          build_profile?: string;
          completed_at?: string;
          distribution?: string;
          git_commit_hash?: string | null;
          platform?: 'android' | 'ios';
        }
      >;
      app_release_notification_deliveries: Table<
        {
          created_at: string;
          eas_build_id: string;
          error_code: string | null;
          expo_receipt_id: string | null;
          id: string;
          push_device_id: string;
          status: 'pending' | 'sent' | 'failed';
          updated_at: string;
        },
        {
          eas_build_id: string;
          push_device_id: string;
        },
        {
          error_code?: string | null;
          expo_receipt_id?: string | null;
          status?: 'pending' | 'sent' | 'failed';
        }
      >;
      notification_preferences: Table<
        {
          created_at: string;
          diaper_enabled: boolean;
          family_id: string;
          feeding_enabled: boolean;
          measurement_enabled: boolean;
          note_enabled: boolean;
          paused_until: string | null;
          sleep_enabled: boolean;
          updated_at: string;
          user_id: string;
        },
        {
          diaper_enabled?: boolean;
          family_id: string;
          feeding_enabled?: boolean;
          measurement_enabled?: boolean;
          note_enabled?: boolean;
          paused_until?: string | null;
          sleep_enabled?: boolean;
          user_id: string;
        },
        {
          diaper_enabled?: boolean;
          feeding_enabled?: boolean;
          measurement_enabled?: boolean;
          note_enabled?: boolean;
          paused_until?: string | null;
          sleep_enabled?: boolean;
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
          archived_at: string | null;
          archived_by: string | null;
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
          notes: string | null;
          recorded_by: string;
          source: string | null;
          weight_grams: number | null;
        },
        {
          baby_id: string;
          head_circumference_millimeters?: number | null;
          length_millimeters?: number | null;
          measured_at: string;
          notes?: string | null;
          source?: string | null;
          weight_grams?: number | null;
        },
        {
          head_circumference_millimeters?: number | null;
          length_millimeters?: number | null;
          measured_at?: string;
          notes?: string | null;
          source?: string | null;
          weight_grams?: number | null;
        }
      >;
      baby_notes: Table<
        {
          baby_id: string;
          content: string;
          created_at: string;
          id: string;
          occurred_at: string;
          recorded_by: string;
          updated_at: string;
        },
        {
          baby_id: string;
          content: string;
          occurred_at?: string;
        },
        {
          content?: string;
          occurred_at?: string;
        }
      >;
      family_audit_logs: Table<
        {
          action: 'created' | 'updated' | 'deleted';
          actor_user_id: string | null;
          baby_id: string | null;
          created_at: string;
          details: Json;
          entity_id: string | null;
          entity_type:
            | 'baby'
            | 'baby_note'
            | 'care_event'
            | 'family_member'
            | 'measurement';
          family_id: string;
          id: number;
        },
        Record<string, never>,
        Record<string, never>
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
    Views: {
      care_timeline: {
        Row: {
          amount_milliliters: number | null;
          baby_id: string;
          breast_side: string | null;
          content: string | null;
          diaper_condition: string | null;
          ended_at: string | null;
          event_type: string;
          feeding_method: string | null;
          head_circumference_millimeters: number | null;
          id: string;
          length_millimeters: number | null;
          measurement_source: string | null;
          notes: string | null;
          occurred_at: string;
          recorded_by: string;
          source_type: 'baby_note' | 'care_event' | 'measurement';
          weight_grams: number | null;
        };
        Relationships: [];
      };
    };
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
      list_archived_babies: {
        Args: Record<string, never>;
        Returns: {
          archived_at: string;
          baby_id: string;
          baby_name: string;
          family_id: string;
        }[];
      };
      remove_family_member: {
        Args: {
          target_member_id: string;
        };
        Returns: undefined;
      };
      register_push_device: {
        Args: {
          target_expo_push_token: string;
          target_platform: string;
        };
        Returns: string;
      };
      register_web_push_device: {
        Args: {
          target_firebase_installation_id: string;
        };
        Returns: string;
      };
      set_baby_archived: {
        Args: {
          should_archive: boolean;
          target_baby_id: string;
        };
        Returns: undefined;
      };
      set_baby_following: {
        Args: {
          should_follow: boolean;
          target_baby_id: string;
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
