import type { BabyProfile } from '@/features/baby-profile/domain/baby-profile';

export interface StoredBabyProfile {
  id: string;
  profile: BabyProfile;
}

export interface BabyProfileRepository {
  load(): Promise<StoredBabyProfile | null>;
  save(babyId: string | undefined, profile: BabyProfile): Promise<StoredBabyProfile>;
}

export class BabyProfilePersistenceError extends Error {
  constructor() {
    super('baby_profile_persistence_failed');
    this.name = 'BabyProfilePersistenceError';
  }
}
