import {
  BabyPhotoError,
  type BabyPhotoRepository,
} from '@/features/baby-profile/application/baby-photo-repository';
import { createBabyPhotoPath } from '@/features/baby-profile/application/baby-photo-path';
import { supabase } from '@/shared/infrastructure/supabase/client';

const bucketName = 'baby-photos';
const signedUrlLifetimeSeconds = 60 * 60;

function createUniquePart(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function mapError(code: string | undefined): BabyPhotoError {
  return new BabyPhotoError(code === '42501' ? 'not_allowed' : 'unknown');
}

async function createSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(path, signedUrlLifetimeSeconds);

  if (error || !data.signedUrl) {
    throw new BabyPhotoError('unknown');
  }

  return data.signedUrl;
}

interface BabyPhotoRecord {
  familyId: string;
  path?: string;
}

async function loadPhotoRecord(babyId: string): Promise<BabyPhotoRecord> {
  const { data, error } = await supabase
    .from('babies')
    .select('family_id, photo_path')
    .eq('id', babyId)
    .maybeSingle();

  if (error || !data) {
    throw mapError(error?.code);
  }

  return {
    familyId: data.family_id,
    path: data.photo_path ?? undefined,
  };
}

async function updatePhotoPath(
  babyId: string,
  photoPath: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('babies')
    .update({ photo_path: photoPath })
    .eq('id', babyId)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    throw mapError(error?.code);
  }
}

async function removeObject(path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucketName).remove([path]);

  if (error) {
    throw new BabyPhotoError('unknown');
  }
}

export const supabaseBabyPhotoRepository: BabyPhotoRepository = {
  async load(babyId) {
    const photo = await loadPhotoRecord(babyId);
    return photo.path ? createSignedUrl(photo.path) : undefined;
  },

  async remove(babyId) {
    const { path: currentPath } = await loadPhotoRecord(babyId);

    if (!currentPath) {
      return;
    }

    await updatePhotoPath(babyId, null);

    try {
      await removeObject(currentPath);
    } catch (error) {
      await updatePhotoPath(babyId, currentPath).catch(() => undefined);
      throw error;
    }
  },

  async replace({ babyId, familyId, image }) {
    const currentPhoto = await loadPhotoRecord(babyId);

    if (currentPhoto.familyId !== familyId) {
      throw new BabyPhotoError('not_allowed');
    }

    const currentPath = currentPhoto.path;
    const nextPath = createBabyPhotoPath(
      familyId,
      babyId,
      createUniquePart(),
    );
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(nextPath, image.bytes, {
        cacheControl: '3600',
        contentType: image.mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new BabyPhotoError('upload_failed');
    }

    try {
      const signedUrl = await createSignedUrl(nextPath);
      await updatePhotoPath(babyId, nextPath);

      if (currentPath && currentPath !== nextPath) {
        void removeObject(currentPath).catch(() => undefined);
      }

      return signedUrl;
    } catch (error) {
      await removeObject(nextPath).catch(() => undefined);
      throw error;
    }
  },
};
