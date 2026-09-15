import { requestWidgetUpdate } from 'react-native-android-widget';

import {
  createEmptyCareWidgetSnapshot,
  type CareWidgetSnapshot,
} from '@/features/care-widget/domain/care-widget-snapshot';
import {
  bindCareWidgetToBaby,
  clearCareWidgetBabyData,
  clearCareWidgetData,
  loadCareWidgetBabyId,
  loadCareWidgetSnapshot,
  retainCareWidgetDataForBabies,
  saveCareWidgetSnapshot,
} from '@/features/care-widget/infrastructure/care-widget-storage';
import { createCareWidgetRepresentation } from '@/features/care-widget/presentation/care-widget-view.android';

const widgetName = 'NidunaCareWidget';

async function renderEmptyCareWidgets(): Promise<void> {
  const emptySnapshot = createEmptyCareWidgetSnapshot();

  await requestWidgetUpdate({
    renderWidget: () => createCareWidgetRepresentation(emptySnapshot),
    widgetName,
  });
}

async function renderStoredCareWidgets(): Promise<void> {
  const emptySnapshot = createEmptyCareWidgetSnapshot();

  await requestWidgetUpdate({
    renderWidget: async ({ widgetId }) => {
      const babyId = await loadCareWidgetBabyId(widgetId);
      const snapshot = babyId
        ? await loadCareWidgetSnapshot(widgetId)
        : emptySnapshot;

      return createCareWidgetRepresentation(snapshot);
    },
    widgetName,
  });
}

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

export async function clearCareWidgets(): Promise<void> {
  await clearCareWidgetData();
  await renderEmptyCareWidgets();
}

export async function clearCareWidgetsForBaby(babyId: string): Promise<void> {
  await clearCareWidgetBabyData(babyId);
  await renderStoredCareWidgets();
}

export async function reconcileCareWidgets(babyIds: string[]): Promise<void> {
  await retainCareWidgetDataForBabies(babyIds);
  await renderStoredCareWidgets();
}
