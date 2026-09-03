import type { BabyAvatarVariant } from '@/features/avatars/domain/avatar';

export interface BabyAvatarRepository {
  load(babyId: string): Promise<BabyAvatarVariant | undefined>;
  save(babyId: string, avatarKey: BabyAvatarVariant): Promise<void>;
}

export class BabyAvatarError extends Error {
  constructor() {
    super('baby_avatar_persistence_failed');
    this.name = 'BabyAvatarError';
  }
}
