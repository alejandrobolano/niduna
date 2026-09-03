import type { BabyLifeStage } from '@/features/baby-profile/domain/baby-profile';
import type { AppSection } from '@/features/home/domain/app-section';

const careHistorySections = new Set<AppSection>(['history', 'summary']);

export function canAccessCareHistory(
  lifeStage: BabyLifeStage | undefined,
): boolean {
  return lifeStage !== 'expected';
}

export function resolveAccessibleAppSection(
  section: AppSection,
  lifeStage: BabyLifeStage | undefined,
): AppSection {
  if (!canAccessCareHistory(lifeStage) && careHistorySections.has(section)) {
    return 'handoff';
  }

  return section;
}
