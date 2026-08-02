export type CareNotificationCategory = 'diaper' | 'feeding' | 'sleep';

export interface RecipientPreference {
  diaper_enabled: boolean;
  feeding_enabled: boolean;
  paused_until: string | null;
  sleep_enabled: boolean;
}

export interface CareNotificationRecipientInput {
  actorUserId: string;
  eventType: CareNotificationCategory;
  hasActiveDevice: boolean;
  isActiveFollower: boolean;
  now: Date;
  preference?: RecipientPreference;
  recipientUserId: string;
}

export function shouldNotifyCareFollower({
  actorUserId,
  eventType,
  hasActiveDevice,
  isActiveFollower,
  now,
  preference,
  recipientUserId,
}: CareNotificationRecipientInput): boolean {
  if (
    actorUserId === recipientUserId ||
    !hasActiveDevice ||
    !isActiveFollower
  ) {
    return false;
  }

  if (
    preference?.paused_until &&
    Date.parse(preference.paused_until) > now.getTime()
  ) {
    return false;
  }

  if (!preference) {
    return true;
  }

  if (eventType === 'feeding') {
    return preference.feeding_enabled;
  }

  if (eventType === 'diaper') {
    return preference.diaper_enabled;
  }

  return preference.sleep_enabled;
}
