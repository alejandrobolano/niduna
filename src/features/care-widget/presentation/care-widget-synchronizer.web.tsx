import type { CareRepository } from '@/features/care/application/care-repository';

interface CareWidgetSynchronizerProps {
  babyId?: string;
  enabled: boolean;
  repository: CareRepository;
  userId: string;
}

export function CareWidgetSynchronizer(_: CareWidgetSynchronizerProps) {
  return null;
}
