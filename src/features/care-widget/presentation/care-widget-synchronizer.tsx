import { useEffect } from 'react';

import { subscribeToCareDataChanges } from '@/features/care/application/care-data-events';
import type { CareRepository } from '@/features/care/application/care-repository';
import {
  createCareWidgetSnapshot,
  createEmptyCareWidgetSnapshot,
} from '@/features/care-widget/domain/care-widget-snapshot';
import { updateCareWidget } from '@/features/care-widget/infrastructure/care-widget-service';

interface CareWidgetSynchronizerProps {
  babyId?: string;
  enabled: boolean;
  repository: CareRepository;
  userId: string;
}

export function CareWidgetSynchronizer({
  babyId,
  enabled,
  repository,
  userId,
}: CareWidgetSynchronizerProps) {
  useEffect(() => {
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
          const dashboard =
            enabled && babyId
              ? await repository.load(userId, babyId)
              : null;

          if (active) {
            await updateCareWidget(
              dashboard
                ? createCareWidgetSnapshot(dashboard)
                : createEmptyCareWidgetSnapshot(),
            );
          }
        } catch {
          reloadQueued = false;
        }
      } while (active && reloadQueued);

      loading = false;
    };

    void synchronize();

    if (!enabled || !babyId) {
      return () => {
        active = false;
      };
    }

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
  }, [babyId, enabled, repository, userId]);

  return null;
}
