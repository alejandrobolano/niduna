import type { BabyLifeStage } from '@/features/baby-profile/domain/baby-profile';
import type { AppSection } from '@/features/home/domain/app-section';

const postnatalCareSections = new Set<AppSection>([
  'history',
  'medications',
  'summary',
]);

export function canAccessHandoff(
  lifeStage: BabyLifeStage | undefined,
): boolean {
  return lifeStage === 'expected' || lifeStage === 'born';
}

export function canAccessCare(
  lifeStage: BabyLifeStage | undefined,
): boolean {
  return lifeStage === 'born';
}

export function resolveAccessibleAppSection(
  section: AppSection,
  lifeStage: BabyLifeStage | undefined,
): AppSection {
  if (section === 'handoff' && !canAccessHandoff(lifeStage)) {
    return 'baby';
  }

  if (!canAccessCare(lifeStage) && postnatalCareSections.has(section)) {
    return 'baby';
  }

  return section;
}
