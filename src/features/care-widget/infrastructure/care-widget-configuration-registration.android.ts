import { registerWidgetConfigurationScreen } from 'react-native-android-widget';

import { CareWidgetConfigurationScreen } from '@/features/care-widget/presentation/care-widget-configuration-screen.android';

export function registerCareWidgetConfigurationScreen(): void {
  registerWidgetConfigurationScreen(CareWidgetConfigurationScreen);
}
