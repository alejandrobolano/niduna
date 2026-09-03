import type { BabyLifeStage, SexAtBirth } from '@/features/baby-profile/domain/baby-profile';
import type { BabyAvatarVariant, MemberAvatarVariant } from '@/features/avatars/domain/avatar';
import type { FamilyRelationship, FamilyRole } from '@/features/family/domain/family';

export interface FamilyBabySummary {
  avatarKey?: BabyAvatarVariant;
  id: string;
  lifeStage: BabyLifeStage;
  name: string;
  photoUrl?: string;
  sexAtBirth?: SexAtBirth;
}

export interface ArchivedBabySummary {
  archivedAt: string;
  id: string;
  name: string;
}

export interface FamilyBabyGroup {
  archivedBabies: ArchivedBabySummary[];
  babies: FamilyBabySummary[];
  currentUserAvatarKey?: MemberAvatarVariant;
  currentUserAvatarUrl?: string;
  currentUserRelationship?: FamilyRelationship;
  id: string;
  name: string;
  role: FamilyRole;
  unfollowedBabies: FamilyBabySummary[];
}

export interface FamilyBabySelection {
  babyId?: string;
  familyId: string;
}
