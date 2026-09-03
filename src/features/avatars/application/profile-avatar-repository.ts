import type { PreparedAvatarImage } from '@/features/avatars/application/avatar-image';
import type { MemberAvatarVariant } from '@/features/avatars/domain/avatar';

export interface ProfileAvatar {
  avatarKey?: MemberAvatarVariant;
  photoUrl?: string;
}

export interface ProfileAvatarRepository {
  load(userId: string): Promise<ProfileAvatar>;
  removePhoto(userId: string): Promise<void>;
  replacePhoto(userId: string, image: PreparedAvatarImage): Promise<string>;
  saveAnimal(userId: string, avatarKey: MemberAvatarVariant): Promise<void>;
}

export class ProfileAvatarError extends Error {
  constructor(readonly code: 'invalid_image' | 'not_allowed' | 'upload_failed' | 'unknown') {
    super(`profile_avatar_${code}`);
    this.name = 'ProfileAvatarError';
  }
}
