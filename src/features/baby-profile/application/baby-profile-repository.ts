import type { BabyProfile } from '@/features/baby-profile/domain/baby-profile';

export interface StoredBabyProfile {
  id: string;
  profile: BabyProfile;
}

export interface SaveBabyProfileInput {
  babyId?: string;
  familyId: string;
  profile: BabyProfile;
}

export interface BabyProfileRepository {
  load(babyId: string | undefined): Promise<StoredBabyProfile | null>;
  save(input: SaveBabyProfileInput): Promise<StoredBabyProfile>;
}

export class BabyProfilePersistenceError extends Error {
  constructor() {
    super('baby_profile_persistence_failed');
    this.name = 'BabyProfilePersistenceError';
  }
}
