import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { createEmptyCareWidgetSnapshot } from '@/features/care-widget/domain/care-widget-snapshot';
import { loadCareWidgetSnapshot } from '@/features/care-widget/infrastructure/care-widget-storage';
import { createCareWidgetRepresentation } from '@/features/care-widget/presentation/care-widget-view.android';

export async function careWidgetTaskHandler({
  renderWidget,
  widgetAction,
}: WidgetTaskHandlerProps): Promise<void> {
  if (widgetAction === 'WIDGET_DELETED') {
    return;
  }

  const snapshot = await loadCareWidgetSnapshot().catch(() =>
    createEmptyCareWidgetSnapshot(),
  );
  renderWidget(createCareWidgetRepresentation(snapshot));
}
