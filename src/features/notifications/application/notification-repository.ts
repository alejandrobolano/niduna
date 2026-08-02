import type { NotificationPreferences } from '@/features/notifications/domain/notification-preferences';

export type NativeNotificationPlatform = 'android' | 'ios';

export interface NotificationSettings {
  hasActiveDevice: boolean;
  preferences: NotificationPreferences;
}

export interface PushDeviceRegistration {
  platform: NativeNotificationPlatform;
  token: string;
}

export interface NotificationRepository {
  loadSettings(
    familyId: string,
    userId: string,
    currentToken?: string,
  ): Promise<NotificationSettings>;
  registerDevice(registration: PushDeviceRegistration): Promise<void>;
  savePreferences(
    familyId: string,
    userId: string,
    preferences: NotificationPreferences,
  ): Promise<void>;
}

export type PushPermissionResult =
  | { status: 'granted'; registration: PushDeviceRegistration }
  | { status: 'denied' }
  | { status: 'unavailable' };

export interface PushPermissionService {
  getExistingRegistration(): Promise<PushDeviceRegistration | undefined>;
  requestRegistration(): Promise<PushPermissionResult>;
}
