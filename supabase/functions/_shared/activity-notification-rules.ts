export type ActivityNotificationCategory = 'measurement' | 'note' | 'story';

export interface ActivityRecipientPreference {
  measurement_enabled: boolean;
  note_enabled: boolean;
  paused_until: string | null;
  story_enabled: boolean;
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

  if (category === 'note') {
    return preference.note_enabled;
  }

  if (category === 'story') {
    return preference.story_enabled;
  }

  return preference.measurement_enabled;
}

export function selectEligibleActivityDevices<
  Device extends { user_id: string },
>({
  actorUserId,
  category,
  devices,
  now,
  preferencesByUser,
}: {
  actorUserId: string;
  category: ActivityNotificationCategory;
  devices: Device[];
  now: Date;
  preferencesByUser: ReadonlyMap<string, ActivityRecipientPreference>;
}): Device[] {
  return devices.filter((device) => shouldNotifyActivityFollower({
    actorUserId,
    category,
    hasActiveDevice: true,
    isActiveFollower: true,
    now,
    preference: preferencesByUser.get(device.user_id),
    recipientUserId: device.user_id,
  }));
}
