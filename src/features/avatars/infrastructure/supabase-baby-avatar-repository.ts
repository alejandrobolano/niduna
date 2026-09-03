import { BabyAvatarError, type BabyAvatarRepository } from '@/features/avatars/application/baby-avatar-repository';
import { supabase } from '@/shared/infrastructure/supabase/client';

export const supabaseBabyAvatarRepository: BabyAvatarRepository = {
  async load(babyId) {
    const { data, error } = await supabase.from('babies').select('avatar_key').eq('id', babyId).single();
    if (error) throw new BabyAvatarError();
    return data.avatar_key ?? undefined;
  },

  async save(babyId, avatarKey) {
    const { error } = await supabase.from('babies').update({ avatar_key: avatarKey }).eq('id', babyId);
    if (error) throw new BabyAvatarError();
  },
};
