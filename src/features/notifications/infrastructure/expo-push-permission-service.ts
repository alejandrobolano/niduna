import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type {
  PushDeviceRegistration,
  PushPermissionResult,
  PushPermissionService,
} from '@/features/notifications/application/notification-repository';

async function getRegistration(): Promise<PushDeviceRegistration | undefined> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return undefined;
  }

  const Notifications = await import('expo-notifications');
  const permissions = await Notifications.getPermissionsAsync();

  if (!permissions.granted) {
    return undefined;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (typeof projectId !== 'string' || !projectId) {
    return undefined;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;

  return { platform: Platform.OS, token };
}

export const expoPushPermissionService: PushPermissionService = {
  getExistingRegistration: getRegistration,

  async requestRegistration(): Promise<PushPermissionResult> {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return { status: 'unavailable' };
    }

    const Notifications = await import('expo-notifications');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('care-updates', {
        importance: Notifications.AndroidImportance.DEFAULT,
        name: 'Cuidados del bebé',
        vibrationPattern: [0, 180],
      });
    }

    const current = await Notifications.getPermissionsAsync();
    const requested =
      current.status === 'granted'
        ? current
        : await Notifications.requestPermissionsAsync();

    if (!requested.granted) {
      return { status: 'denied' };
    }

    const registration = await getRegistration();

    if (!registration) {
      return { status: 'unavailable' };
    }

    return {
      registration,
      status: 'granted',
    };
  },
};
