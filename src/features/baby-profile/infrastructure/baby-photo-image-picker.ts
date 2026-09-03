import { BabyPhotoError, type PreparedBabyPhoto } from '@/features/baby-profile/application/baby-photo-repository';
import { AvatarImagePickerError, pickAndPrepareAvatarImage } from '@/features/avatars/infrastructure/avatar-image-picker';

export async function pickAndPrepareBabyPhoto(): Promise<PreparedBabyPhoto | undefined> {
  try {
    return await pickAndPrepareAvatarImage();
  } catch (error) {
    if (error instanceof AvatarImagePickerError) {
      throw new BabyPhotoError(error.code);
    }

    throw error;
  }
}
