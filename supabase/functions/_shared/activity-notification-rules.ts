export type ActivityNotificationCategory = 'measurement' | 'note';

export interface ActivityRecipientPreference {
  measurement_enabled: boolean;
  note_enabled: boolean;
  paused_until: string | null;
}

export interface ActivityNotificationRecipientInput {
  actorUserId: string;
  category: ActivityNotificationCategory;
  hasActiveDevice: boolean;
  isActiveFollower: boolean;
  now: Date;
  preference?: ActivityRecipientPreference;
  recipientUserId: string;
}

export function shouldNotifyActivityFollower({
  actorUserId,
  category,
  hasActiveDevice,
  isActiveFollower,
  now,
  preference,
  recipientUserId,
}: ActivityNotificationRecipientInput): boolean {
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

  return category === 'note'
    ? preference.note_enabled
    : preference.measurement_enabled;
}
