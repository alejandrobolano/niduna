import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';

import { isTrustedReleaseUrl } from '@/features/app-updates/domain/app-release';

export function AppUpdateNotificationObserver() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let active = true;
    let removeListener: (() => void) | undefined;

    void import('expo-notifications').then((Notifications) => {
      if (!active) {
        return;
      }

      function openReleaseUrl(data: Record<string, unknown> | undefined) {
        const url = data?.url;

        if (isTrustedReleaseUrl(url)) {
          void Linking.openURL(url);
        }
      }

      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) {
          openReleaseUrl(response.notification.request.content.data);
          void Notifications.clearLastNotificationResponseAsync();
        }
      });

      const subscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
          openReleaseUrl(response.notification.request.content.data);
        });

      removeListener = () => subscription.remove();
    });

    return () => {
      active = false;
      removeListener?.();
    };
  }, []);

  return null;
}
