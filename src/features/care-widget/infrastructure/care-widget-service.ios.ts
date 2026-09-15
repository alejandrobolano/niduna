import {
  createEmptyCareWidgetSnapshot,
  type CareWidgetSnapshot,
} from '@/features/care-widget/domain/care-widget-snapshot';
import { NidunaCareWidget } from '@/features/care-widget/presentation/care-widget-view.ios';

export async function updateCareWidget(
  snapshot: CareWidgetSnapshot,
): Promise<void> {
  NidunaCareWidget.updateSnapshot(snapshot);
}

export async function clearCareWidgets(): Promise<void> {
  NidunaCareWidget.updateSnapshot(createEmptyCareWidgetSnapshot());
}

export async function clearCareWidgetsForBaby(_: string): Promise<void> {
  await clearCareWidgets();
}

export async function reconcileCareWidgets(babyIds: string[]): Promise<void> {
  if (babyIds.length === 0) {
    await clearCareWidgets();
  }
}
