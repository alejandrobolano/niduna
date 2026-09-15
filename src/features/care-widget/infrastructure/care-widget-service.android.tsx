import { requestWidgetUpdate } from 'react-native-android-widget';

import type { CareWidgetSnapshot } from '@/features/care-widget/domain/care-widget-snapshot';
import {
  bindCareWidgetToBaby,
  loadCareWidgetBabyId,
  loadCareWidgetSnapshot,
  saveCareWidgetSnapshot,
} from '@/features/care-widget/infrastructure/care-widget-storage';
import { createCareWidgetRepresentation } from '@/features/care-widget/presentation/care-widget-view.android';

const widgetName = 'NidunaCareWidget';

export async function updateCareWidget(
  snapshot: CareWidgetSnapshot,
): Promise<void> {
  await saveCareWidgetSnapshot(snapshot);
  await requestWidgetUpdate({
    renderWidget: async ({ widgetId }) => {
      const configuredBabyId = await loadCareWidgetBabyId(widgetId);

      if (!configuredBabyId && snapshot.babyId) {
        await bindCareWidgetToBaby(widgetId, snapshot.babyId);
      }

      const widgetSnapshot = configuredBabyId
        ? await loadCareWidgetSnapshot(widgetId)
        : snapshot;

      return createCareWidgetRepresentation(widgetSnapshot);
    },
    widgetName,
  });
}
