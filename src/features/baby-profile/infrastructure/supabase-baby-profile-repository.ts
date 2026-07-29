import {
  BabyProfilePersistenceError,
  type BabyProfileRepository,
} from '@/features/baby-profile/application/baby-profile-repository';
import {
  mapStoredProfile,
  toRpcArguments,
} from '@/features/baby-profile/infrastructure/supabase-baby-profile-mapper';
import { supabase } from '@/shared/infrastructure/supabase/client';

export const supabaseBabyProfileRepository: BabyProfileRepository = {
  async load() {
    const { data: baby, error: babyError } = await supabase
      .from('babies')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (babyError) {
      throw new BabyProfilePersistenceError();
    }

    if (!baby) {
      return null;
    }

    const { data: birthMeasurement, error: measurementError } = await supabase
      .from('baby_measurements')
      .select('*')
      .eq('baby_id', baby.id)
      .eq('source', 'birth')
      .limit(1)
      .maybeSingle();

    if (measurementError) {
      throw new BabyProfilePersistenceError();
    }

    return mapStoredProfile(baby, birthMeasurement);
  },

  async save(babyId, profile) {
    const { data: savedBabyId, error } = await supabase.rpc(
      'save_baby_profile',
      toRpcArguments(babyId, profile),
    );

    if (error || !savedBabyId) {
      throw new BabyProfilePersistenceError();
    }

    return {
      id: savedBabyId,
      profile: {
        ...profile,
        name: profile.name.trim(),
        notes: profile.notes?.trim() || undefined,
      },
    };
  },
};
