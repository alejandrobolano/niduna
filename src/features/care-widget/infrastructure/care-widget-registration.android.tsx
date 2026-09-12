import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { loadCareWidgetSnapshot } from '@/features/care-widget/infrastructure/care-widget-storage';
import { CareWidgetView } from '@/features/care-widget/presentation/care-widget-view.android';

registerWidgetTaskHandler(async ({ renderWidget, widgetAction }) => {
  if (widgetAction === 'WIDGET_DELETED') {
    return;
  }

  const snapshot = await loadCareWidgetSnapshot();
  renderWidget({
    dark: <CareWidgetView dark snapshot={snapshot} />,
    light: <CareWidgetView dark={false} snapshot={snapshot} />,
  });
});
