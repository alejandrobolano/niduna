import type { BabyLifeStage } from '@/features/baby-profile/domain/baby-profile';
import type { FamilyRole } from '@/features/family/domain/family';

export interface FamilyBabySummary {
  id: string;
  lifeStage: BabyLifeStage;
  name: string;
  photoUrl?: string;
}

export interface ArchivedBabySummary {
  archivedAt: string;
  id: string;
  name: string;
}

export interface FamilyBabyGroup {
  archivedBabies: ArchivedBabySummary[];
  babies: FamilyBabySummary[];
  id: string;
  name: string;
  role: FamilyRole;
  unfollowedBabies: FamilyBabySummary[];
}

export interface FamilyBabySelection {
  babyId?: string;
  familyId: string;
}
