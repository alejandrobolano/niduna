import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { publishCareDataChanged } from '@/features/care/application/care-data-events';

export function NativeNotificationObserver() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let active = true;
    let removeNotificationListener: (() => void) | undefined;

    void import('expo-notifications').then((Notifications) => {
      if (!active) {
        return;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      const subscription = Notifications.addNotificationReceivedListener(
        publishCareDataChanged,
      );

      removeNotificationListener = () => subscription.remove();
    });

    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') {
          publishCareDataChanged();
        }
      },
    );

    return () => {
      active = false;
      removeNotificationListener?.();
      appStateSubscription.remove();
    };
  }, []);

  return null;
}
