import type { BabyLifeStage, SexAtBirth } from '@/features/baby-profile/domain/baby-profile';
import type { BabyAvatarVariant, MemberAvatarVariant } from '@/features/avatars/domain/avatar';
import type { FamilyRelationship, FamilyRole } from '@/features/family/domain/family';
import type { FamilyBabyGroup } from '@/features/family/domain/family-baby-context';

interface MembershipRow {
  family_id: string;
  relationship?: FamilyRelationship;
  role: FamilyRole;
}

interface FamilyRow {
  id: string;
  name: string;
}

interface BabyRow {
  avatar_key?: BabyAvatarVariant | null;
  family_id: string;
  id: string;
  life_stage: BabyLifeStage;
  name: string;
  photo_url?: string;
  sex_at_birth?: SexAtBirth | null;
}

interface CurrentProfileRow {
  avatar_key?: MemberAvatarVariant | null;
  avatar_url?: string;
}

interface FollowerRow {
  baby_id: string;
}

interface ArchivedBabyRow {
  archived_at: string;
  baby_id: string;
  baby_name: string;
  family_id: string;
}

export function mapFamilyBabyGroups(
  memberships: MembershipRow[],
  families: FamilyRow[],
  babies: BabyRow[],
  followers: FollowerRow[],
  archivedBabies: ArchivedBabyRow[],
  currentProfile: CurrentProfileRow = {},
): FamilyBabyGroup[] {
  const familiesById = new Map(families.map((family) => [family.id, family]));
  const followedBabyIds = new Set(
    followers.map((follower) => follower.baby_id),
  );

  return memberships.flatMap((membership) => {
    const family = familiesById.get(membership.family_id);

    if (!family) {
      return [];
    }

    const familyBabies = babies.filter(
      (baby) => baby.family_id === family.id,
    );

    return [
      {
        archivedBabies: archivedBabies
          .filter((baby) => baby.family_id === family.id)
          .map((baby) => ({
            archivedAt: baby.archived_at,
            id: baby.baby_id,
            name: baby.baby_name,
          })),
        babies: familyBabies
          .filter((baby) => followedBabyIds.has(baby.id))
          .map(mapBaby),
        currentUserAvatarKey: currentProfile.avatar_key ?? undefined,
        currentUserAvatarUrl: currentProfile.avatar_url,
        currentUserRelationship: membership.relationship ?? 'other',
        id: family.id,
        name: family.name,
        role: membership.role,
        unfollowedBabies: familyBabies
          .filter((baby) => !followedBabyIds.has(baby.id))
          .map(mapBaby),
      },
    ];
  });
}

function mapBaby(baby: BabyRow) {
  return {
    avatarKey: baby.avatar_key ?? undefined,
    id: baby.id,
    lifeStage: baby.life_stage,
    name: baby.name,
    photoUrl: baby.photo_url,
    sexAtBirth: baby.sex_at_birth ?? undefined,
  };
}
