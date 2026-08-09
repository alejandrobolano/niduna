import type { AppRelease } from '@/features/app-updates/domain/app-release';

export interface AppReleaseRepository {
  loadLatestAndroidPreview(): Promise<AppRelease | undefined>;
}
