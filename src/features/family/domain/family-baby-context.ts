import type { BabyLifeStage } from '@/features/baby-profile/domain/baby-profile';
import type { FamilyRole } from '@/features/family/domain/family';

export interface FamilyBabySummary {
  id: string;
  lifeStage: BabyLifeStage;
  name: string;
}

export interface FamilyBabyGroup {
  babies: FamilyBabySummary[];
  id: string;
  name: string;
  role: FamilyRole;
}

export interface FamilyBabySelection {
  babyId?: string;
  familyId: string;
}
