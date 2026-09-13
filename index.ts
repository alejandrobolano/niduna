import 'expo-router/entry';

import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { careWidgetTaskHandler } from './src/features/care-widget/infrastructure/care-widget-registration';

registerWidgetTaskHandler(careWidgetTaskHandler);
