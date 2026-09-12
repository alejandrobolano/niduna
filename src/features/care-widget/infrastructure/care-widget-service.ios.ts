import type { CareWidgetSnapshot } from '@/features/care-widget/domain/care-widget-snapshot';
import { NidunaCareWidget } from '@/features/care-widget/presentation/care-widget-view.ios';

export async function updateCareWidget(
  snapshot: CareWidgetSnapshot,
): Promise<void> {
  NidunaCareWidget.updateSnapshot(snapshot);
}
