import {
  FamilyBabyContextPersistenceError,
  type FamilyBabyContextRepository,
} from '@/features/family/application/family-baby-context-repository';
import type { FamilyBabyGroup } from '@/features/family/domain/family-baby-context';
import { supabase } from '@/shared/infrastructure/supabase/client';

export const supabaseFamilyBabyContextRepository: FamilyBabyContextRepository =
  {
    async load(userId) {
      const { data: memberships, error: membershipError } = await supabase
        .from('family_members')
        .select('family_id, role, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (membershipError) {
        throw new FamilyBabyContextPersistenceError();
      }

      const familyIds = memberships.map((membership) => membership.family_id);

      if (familyIds.length === 0) {
        return [];
      }

      const [familiesResult, babiesResult] = await Promise.all([
        supabase
          .from('families')
          .select('id, name')
          .in('id', familyIds),
        supabase
          .from('babies')
          .select('id, family_id, life_stage, name, created_at')
          .in('family_id', familyIds)
          .order('created_at', { ascending: true }),
      ]);
      const error = familiesResult.error ?? babiesResult.error;

      if (error) {
        throw new FamilyBabyContextPersistenceError();
      }

      const familiesById = new Map(
        (familiesResult.data ?? []).map((family) => [family.id, family]),
      );
      const babiesByFamily = new Map<
        string,
        FamilyBabyGroup['babies']
      >();

      for (const baby of babiesResult.data ?? []) {
        const babies = babiesByFamily.get(baby.family_id) ?? [];
        babies.push({
          id: baby.id,
          lifeStage: baby.life_stage,
          name: baby.name,
        });
        babiesByFamily.set(baby.family_id, babies);
      }

      return memberships.flatMap((membership) => {
        const family = familiesById.get(membership.family_id);

        return family
          ? [
              {
                babies: babiesByFamily.get(family.id) ?? [],
                id: family.id,
                name: family.name,
                role: membership.role,
              },
            ]
          : [];
      });
    },
  };
