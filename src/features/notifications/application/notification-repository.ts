import type { NotificationPreferences } from '@/features/notifications/domain/notification-preferences';

export type NotificationPlatform = 'android' | 'ios' | 'web';

export interface NotificationSettings {
  hasActiveDevice: boolean;
  preferences: NotificationPreferences;
}

export interface PushDeviceRegistration {
  platform: NotificationPlatform;
  token: string;
}

export interface NotificationRepository {
  loadSettings(
    familyId: string,
    userId: string,
    currentRegistration?: PushDeviceRegistration,
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
