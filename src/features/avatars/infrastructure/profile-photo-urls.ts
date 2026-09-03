import { supabase } from '@/shared/infrastructure/supabase/client';

const bucket = 'profile-photos';
const signedUrlLifetimeSeconds = 60 * 60;

export async function createProfilePhotoUrls(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (uniquePaths.length === 0) return new Map();

  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(uniquePaths, signedUrlLifetimeSeconds);
  if (error) return new Map();

  return new Map((data ?? []).flatMap((photo) => photo.path && photo.signedUrl ? [[photo.path, photo.signedUrl] as const] : []));
}
