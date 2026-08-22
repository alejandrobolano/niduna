import { describe, expect, it, vi } from 'vitest';

import { activateFamilyNotifications } from '../src/features/notifications/application/activate-family-notifications';
import type {
  NotificationRepository,
  PushPermissionService,
} from '../src/features/notifications/application/notification-repository';
import { defaultNotificationPreferences } from '../src/features/notifications/domain/notification-preferences';

function createRepository(): NotificationRepository {
  return {
    loadSettings: vi.fn(),
    registerDevice: vi.fn(),
    savePreferences: vi.fn(),
  };
}

describe('family notification activation', () => {
  it('registers the device and preferences when permission is granted', async () => {
    const repository = createRepository();
    const permissionService: PushPermissionService = {
      getExistingRegistration: vi.fn(),
      requestRegistration: vi.fn().mockResolvedValue({
        registration: { platform: 'android', token: 'token-1' },
        status: 'granted',
      }),
    };

    await expect(
      activateFamilyNotifications({
        familyId: 'family-1',
        permissionService,
        preferences: defaultNotificationPreferences,
        repository,
        userId: 'user-1',
      }),
    ).resolves.toBe('granted');
    expect(repository.registerDevice).toHaveBeenCalledOnce();
    expect(repository.savePreferences).toHaveBeenCalledWith(
      'family-1',
      'user-1',
      defaultNotificationPreferences,
    );
  });

  it.each(['denied', 'unavailable'] as const)(
    'does not register anything when permission is %s',
    async (status) => {
      const repository = createRepository();
      const permissionService: PushPermissionService = {
        getExistingRegistration: vi.fn(),
        requestRegistration: vi.fn().mockResolvedValue({ status }),
      };

      await expect(
        activateFamilyNotifications({
          familyId: 'family-1',
          permissionService,
          preferences: defaultNotificationPreferences,
          repository,
          userId: 'user-1',
        }),
      ).resolves.toBe(status);
      expect(repository.registerDevice).not.toHaveBeenCalled();
      expect(repository.savePreferences).not.toHaveBeenCalled();
    },
  );

  it('propagates registration failures without saving preferences', async () => {
    const repository = createRepository();
    vi.mocked(repository.registerDevice).mockRejectedValue(new Error('offline'));
    const permissionService: PushPermissionService = {
      getExistingRegistration: vi.fn(),
      requestRegistration: vi.fn().mockResolvedValue({
        registration: { platform: 'web', token: 'token-1' },
        status: 'granted',
      }),
    };

    await expect(
      activateFamilyNotifications({
        familyId: 'family-1',
        permissionService,
        preferences: defaultNotificationPreferences,
        repository,
        userId: 'user-1',
      }),
    ).rejects.toThrow('offline');
    expect(repository.savePreferences).not.toHaveBeenCalled();
  });
});
