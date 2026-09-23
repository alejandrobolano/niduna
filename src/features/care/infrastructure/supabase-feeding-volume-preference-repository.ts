import type { FeedingVolumePreferenceRepository } from '../application/feeding-volume-preference-repository';
import type { FeedingVolumeUnit } from '../domain/feeding-volume';
import { supabase } from '@/shared/infrastructure/supabase/client';

export const supabaseFeedingVolumePreferenceRepository: FeedingVolumePreferenceRepository = {
  async load(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('feeding_volume_unit')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);
    return (data.feeding_volume_unit ?? 'ml') as FeedingVolumeUnit;
  },

  async save(userId, unit) {
    const { error } = await supabase
      .from('profiles')
      .update({ feeding_volume_unit: unit })
      .eq('id', userId);

    if (error) throw new Error(error.message);
  },
};
