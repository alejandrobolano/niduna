import type { BabyLifeStage } from '@/features/baby-profile/domain/baby-profile';

export function isBabyLifeStageProtected(
  savedLifeStage: BabyLifeStage | undefined,
  isUnlocked: boolean,
): boolean {
  return savedLifeStage === 'born' && !isUnlocked;
}
