import type { BabyLifeStage } from '@/features/baby-profile/domain/baby-profile';
import type { AppSection } from '@/features/home/domain/app-section';

const careSections = new Set<AppSection>(['handoff', 'history', 'summary']);

export function canAccessCare(
  lifeStage: BabyLifeStage | undefined,
): boolean {
  return lifeStage === 'born';
}

export function resolveAccessibleAppSection(
  section: AppSection,
  lifeStage: BabyLifeStage | undefined,
): AppSection {
  if (!canAccessCare(lifeStage) && careSections.has(section)) {
    return 'baby';
  }

  return section;
}
