import type { FamilyBabyGroup } from '@/features/family/domain/family-baby-context';

export interface FamilyBabyContextRepository {
  load(userId: string): Promise<FamilyBabyGroup[]>;
}

export class FamilyBabyContextPersistenceError extends Error {
  constructor() {
    super('family_baby_context_persistence_failed');
    this.name = 'FamilyBabyContextPersistenceError';
  }
}
