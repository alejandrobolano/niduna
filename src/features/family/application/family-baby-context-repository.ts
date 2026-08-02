import type { FamilyBabyGroup } from '@/features/family/domain/family-baby-context';

export interface FamilyBabyContextRepository {
  archiveBaby(babyId: string): Promise<void>;
  followBaby(babyId: string): Promise<void>;
  load(userId: string): Promise<FamilyBabyGroup[]>;
  restoreBaby(babyId: string): Promise<void>;
  unfollowBaby(babyId: string): Promise<void>;
}

export class FamilyBabyContextPersistenceError extends Error {
  constructor() {
    super('family_baby_context_persistence_failed');
    this.name = 'FamilyBabyContextPersistenceError';
  }
}
