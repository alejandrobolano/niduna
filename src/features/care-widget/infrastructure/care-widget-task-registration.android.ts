import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { careWidgetTaskHandler } from '@/features/care-widget/infrastructure/care-widget-registration';

export function registerCareWidgetTaskHandler(): void {
  registerWidgetTaskHandler(careWidgetTaskHandler);
}
