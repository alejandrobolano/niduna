import 'expo-router/entry';

import { registerCareWidgetConfigurationScreen } from './src/features/care-widget/infrastructure/care-widget-configuration-registration';
import { registerCareWidgetTaskHandler } from './src/features/care-widget/infrastructure/care-widget-task-registration';

registerCareWidgetTaskHandler();
registerCareWidgetConfigurationScreen();
