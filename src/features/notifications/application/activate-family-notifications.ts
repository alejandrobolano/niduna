import type {
  NotificationRepository,
  PushPermissionService,
  PushPermissionResult,
} from '@/features/notifications/application/notification-repository';
import type { NotificationPreferences } from '@/features/notifications/domain/notification-preferences';

export async function activateFamilyNotifications({
  familyId,
  permissionService,
  preferences,
  repository,
  userId,
}: {
  familyId: string;
  permissionService: PushPermissionService;
  preferences: NotificationPreferences;
  repository: NotificationRepository;
  userId: string;
}): Promise<PushPermissionResult['status']> {
  const result = await permissionService.requestRegistration();

  if (result.status !== 'granted') {
    return result.status;
  }

  await repository.registerDevice(result.registration);
  await repository.savePreferences(familyId, userId, preferences);
  return 'granted';
}
