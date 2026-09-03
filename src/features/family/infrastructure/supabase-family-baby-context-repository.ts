import {
  FamilyBabyContextPersistenceError,
  type FamilyBabyContextRepository,
} from '@/features/family/application/family-baby-context-repository';
import { mapFamilyBabyGroups } from '@/features/family/infrastructure/family-baby-context-mapper';
import { supabase } from '@/shared/infrastructure/supabase/client';
import { createProfilePhotoUrls } from '@/features/avatars/infrastructure/profile-photo-urls';

const babyPhotosBucket = 'baby-photos';
const signedPhotoLifetimeSeconds = 60 * 60;

export const supabaseFamilyBabyContextRepository: FamilyBabyContextRepository =
  {
    async archiveBaby(babyId) {
      await setBabyArchived(babyId, true);
    },

    async followBaby(babyId) {
      await setBabyFollowing(babyId, true);
    },

    async load(userId) {
      const { data: memberships, error: membershipError } = await supabase
        .from('family_members')
        .select('id, family_id, role, relationship, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (membershipError) {
        throw new FamilyBabyContextPersistenceError();
      }

      const familyIds = memberships.map((membership) => membership.family_id);

      if (familyIds.length === 0) {
        return [];
      }

      const [familiesResult, babiesResult, followersResult, archivedResult, profileResult] =
        await Promise.all([
          supabase
            .from('families')
            .select('id, name')
            .in('id', familyIds),
          supabase
            .from('babies')
            .select('id, family_id, life_stage, name, sex_at_birth, avatar_key, photo_path, created_at')
            .in('family_id', familyIds)
            .order('created_at', { ascending: true }),
          supabase
            .from('baby_followers')
            .select('baby_id')
            .eq('user_id', userId),
          supabase.rpc('list_archived_babies'),
          supabase.from('profiles').select('avatar_key, avatar_path').eq('id', userId).single(),
        ]);
      const error =
        familiesResult.error ??
        babiesResult.error ??
        followersResult.error ??
        archivedResult.error ?? profileResult.error;

      if (error) {
        throw new FamilyBabyContextPersistenceError();
      }

      const babies = babiesResult.data ?? [];
      const photoUrls = await createSignedPhotoUrls(
        babies.flatMap((baby) => baby.photo_path ? [baby.photo_path] : []),
      );
      const profilePhotoUrls = await createProfilePhotoUrls([profileResult.data?.avatar_path]);

      return mapFamilyBabyGroups(
        memberships,
        familiesResult.data ?? [],
        babies.map((baby) => ({
          ...baby,
          photo_url: baby.photo_path
            ? photoUrls.get(baby.photo_path)
            : undefined,
        })),
        followersResult.data ?? [],
        archivedResult.data ?? [],
        {
          avatar_key: profileResult.data?.avatar_key,
          avatar_url: profileResult.data?.avatar_path
            ? profilePhotoUrls.get(profileResult.data.avatar_path)
            : undefined,
        },
      );
    },

    async restoreBaby(babyId) {
      await setBabyArchived(babyId, false);
    },

    async unfollowBaby(babyId) {
      await setBabyFollowing(babyId, false);
    },
  };

async function createSignedPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const uniquePaths = [...new Set(paths)];

  if (uniquePaths.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.storage
    .from(babyPhotosBucket)
    .createSignedUrls(uniquePaths, signedPhotoLifetimeSeconds);

  if (error) {
    return new Map();
  }

  return new Map(
    (data ?? []).flatMap((photo) =>
      photo.path && photo.signedUrl
        ? [[photo.path, photo.signedUrl] as const]
        : [],
    ),
  );
}

async function setBabyFollowing(babyId: string, shouldFollow: boolean) {
  const { error } = await supabase.rpc('set_baby_following', {
    should_follow: shouldFollow,
    target_baby_id: babyId,
  });

  if (error) {
    throw new FamilyBabyContextPersistenceError();
  }
}

async function setBabyArchived(babyId: string, shouldArchive: boolean) {
  const { error } = await supabase.rpc('set_baby_archived', {
    should_archive: shouldArchive,
    target_baby_id: babyId,
  });

  if (error) {
    throw new FamilyBabyContextPersistenceError();
  }
}
