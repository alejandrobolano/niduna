import { useEffect } from 'react';

import { subscribeToCareDataChanges } from '@/features/care/application/care-data-events';
import type { CareRepository } from '@/features/care/application/care-repository';
import { createCareWidgetSnapshot } from '@/features/care-widget/domain/care-widget-snapshot';
import {
  clearCareWidgetsForBaby,
  reconcileCareWidgets,
  updateCareWidget,
} from '@/features/care-widget/infrastructure/care-widget-service';

interface CareWidgetSynchronizerProps {
  accessibleBabyIds: string[];
  babyId?: string;
  enabled: boolean;
  repository: CareRepository;
  synchronizeDashboard?: boolean;
  userId: string;
}

export function CareWidgetSynchronizer({
  accessibleBabyIds,
  babyId,
  enabled,
  repository,
  synchronizeDashboard = true,
  userId,
}: CareWidgetSynchronizerProps) {
  useEffect(() => {
    void reconcileCareWidgets(accessibleBabyIds).catch(() => undefined);
  }, [accessibleBabyIds]);

  useEffect(() => {
    if (!synchronizeDashboard || !enabled || !babyId) {
      return undefined;
    }

    let active = true;
    let loading = false;
    let reloadQueued = false;

    const synchronize = async () => {
      if (loading) {
        reloadQueued = true;
        return;
      }

      loading = true;

      do {
        reloadQueued = false;

        try {
          const dashboard = await repository.load(userId, babyId);

          if (active) {
            if (dashboard) {
              await updateCareWidget(createCareWidgetSnapshot(dashboard));
            } else {
              await clearCareWidgetsForBaby(babyId);
            }
          }
        } catch {
          reloadQueued = false;
        }
      } while (active && reloadQueued);

      loading = false;
    };

    void synchronize();

    const requestSynchronization = () => void synchronize();
    const unsubscribeRepository = repository.subscribe(
      babyId,
      requestSynchronization,
    );
    const unsubscribeLocal = subscribeToCareDataChanges(
      requestSynchronization,
    );

    return () => {
      active = false;
      unsubscribeLocal();
      unsubscribeRepository();
    };
  }, [
    babyId,
    enabled,
    repository,
    synchronizeDashboard,
    userId,
  ]);

  return null;
}
