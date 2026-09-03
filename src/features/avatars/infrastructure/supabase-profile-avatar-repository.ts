import { ProfileAvatarError, type ProfileAvatarRepository } from '@/features/avatars/application/profile-avatar-repository';
import type { MemberAvatarVariant } from '@/features/avatars/domain/avatar';
import { supabase } from '@/shared/infrastructure/supabase/client';

const bucket = 'profile-photos';
const signedUrlLifetimeSeconds = 60 * 60;

function createPhotoPath(userId: string): string {
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 12)}.jpg`;
}

async function loadPath(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('avatar_key, avatar_path')
    .eq('id', userId)
    .single();

  if (error) throw new ProfileAvatarError(error.code === '42501' ? 'not_allowed' : 'unknown');
  return data;
}

async function createSignedUrl(path?: string | null): Promise<string | undefined> {
  if (!path) return undefined;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, signedUrlLifetimeSeconds);
  return error ? undefined : data.signedUrl;
}

export const supabaseProfileAvatarRepository: ProfileAvatarRepository = {
  async load(userId) {
    const profile = await loadPath(userId);
    return {
      avatarKey: profile.avatar_key ?? undefined,
      photoUrl: await createSignedUrl(profile.avatar_path),
    };
  },

  async removePhoto(userId) {
    const profile = await loadPath(userId);
    const { error } = await supabase.from('profiles').update({ avatar_path: null }).eq('id', userId);
    if (error) throw new ProfileAvatarError(error.code === '42501' ? 'not_allowed' : 'unknown');
    if (profile.avatar_path) await supabase.storage.from(bucket).remove([profile.avatar_path]);
  },

  async replacePhoto(userId, image) {
    const previous = await loadPath(userId);
    const path = createPhotoPath(userId);
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, image.bytes, {
      cacheControl: '3600',
      contentType: image.mimeType,
      upsert: false,
    });
    if (uploadError) throw new ProfileAvatarError(uploadError.message.includes('row-level security') ? 'not_allowed' : 'upload_failed');

    const { error: updateError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
    if (updateError) {
      await supabase.storage.from(bucket).remove([path]);
      throw new ProfileAvatarError(updateError.code === '42501' ? 'not_allowed' : 'unknown');
    }

    if (previous.avatar_path) await supabase.storage.from(bucket).remove([previous.avatar_path]);
    return (await createSignedUrl(path)) ?? image.previewUri;
  },

  async saveAnimal(userId, avatarKey: MemberAvatarVariant) {
    const { error } = await supabase.from('profiles').update({ avatar_key: avatarKey }).eq('id', userId);
    if (error) throw new ProfileAvatarError(error.code === '42501' ? 'not_allowed' : 'unknown');
  },
};
