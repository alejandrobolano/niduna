import { requestWidgetUpdate } from 'react-native-android-widget';

import type { CareWidgetSnapshot } from '@/features/care-widget/domain/care-widget-snapshot';
import { saveCareWidgetSnapshot } from '@/features/care-widget/infrastructure/care-widget-storage';
import { CareWidgetView } from '@/features/care-widget/presentation/care-widget-view.android';

const widgetName = 'NidunaCareWidget';

export async function updateCareWidget(
  snapshot: CareWidgetSnapshot,
): Promise<void> {
  await saveCareWidgetSnapshot(snapshot);
  await requestWidgetUpdate({
    renderWidget: () => ({
      dark: <CareWidgetView dark snapshot={snapshot} />,
      light: <CareWidgetView dark={false} snapshot={snapshot} />,
    }),
    widgetName,
  });
}
