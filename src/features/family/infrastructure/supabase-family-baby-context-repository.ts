import {
  FamilyBabyContextPersistenceError,
  type FamilyBabyContextRepository,
} from '@/features/family/application/family-baby-context-repository';
import { mapFamilyBabyGroups } from '@/features/family/infrastructure/family-baby-context-mapper';
import { supabase } from '@/shared/infrastructure/supabase/client';

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
        .select('id, family_id, role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (membershipError) {
        throw new FamilyBabyContextPersistenceError();
      }

      const familyIds = memberships.map((membership) => membership.family_id);

      if (familyIds.length === 0) {
        return [];
      }

      const [familiesResult, babiesResult, followersResult, archivedResult] =
        await Promise.all([
          supabase
            .from('families')
            .select('id, name')
            .in('id', familyIds),
          supabase
            .from('babies')
            .select('id, family_id, life_stage, name, created_at')
            .in('family_id', familyIds)
            .order('created_at', { ascending: true }),
          supabase
            .from('baby_followers')
            .select('baby_id')
            .eq('user_id', userId),
          supabase.rpc('list_archived_babies'),
        ]);
      const error =
        familiesResult.error ??
        babiesResult.error ??
        followersResult.error ??
        archivedResult.error;

      if (error) {
        throw new FamilyBabyContextPersistenceError();
      }

      return mapFamilyBabyGroups(
        memberships,
        familiesResult.data ?? [],
        babiesResult.data ?? [],
        followersResult.data ?? [],
        archivedResult.data ?? [],
      );
    },

    async restoreBaby(babyId) {
      await setBabyArchived(babyId, false);
    },

    async unfollowBaby(babyId) {
      await setBabyFollowing(babyId, false);
    },
  };

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
