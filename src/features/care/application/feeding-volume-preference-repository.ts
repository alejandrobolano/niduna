import type { FeedingVolumeUnit } from '../domain/feeding-volume';

export interface FeedingVolumePreferenceRepository {
  load(userId: string): Promise<FeedingVolumeUnit>;
  save(userId: string, unit: FeedingVolumeUnit): Promise<void>;
}
