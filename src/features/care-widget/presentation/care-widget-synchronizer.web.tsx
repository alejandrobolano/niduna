import type { CareRepository } from '@/features/care/application/care-repository';

interface CareWidgetSynchronizerProps {
  accessibleBabyIds: string[];
  babyId?: string;
  enabled: boolean;
  repository: CareRepository;
  synchronizeDashboard?: boolean;
  userId: string;
}

export function CareWidgetSynchronizer(_: CareWidgetSynchronizerProps) {
  return null;
}
