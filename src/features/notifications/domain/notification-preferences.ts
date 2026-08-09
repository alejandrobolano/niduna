export type NotificationCategory =
  | 'diaper'
  | 'feeding'
  | 'measurement'
  | 'note'
  | 'sleep';

export interface NotificationPreferences {
  diaperEnabled: boolean;
  feedingEnabled: boolean;
  measurementEnabled: boolean;
  noteEnabled: boolean;
  pausedUntil?: string;
  sleepEnabled: boolean;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  diaperEnabled: true,
  feedingEnabled: true,
  measurementEnabled: true,
  noteEnabled: true,
  sleepEnabled: true,
};

export function isNotificationCategoryEnabled(
  preferences: NotificationPreferences,
  category: NotificationCategory,
): boolean {
  if (category === 'feeding') {
    return preferences.feedingEnabled;
  }

  if (category === 'diaper') {
    return preferences.diaperEnabled;
  }

  if (category === 'note') {
    return preferences.noteEnabled;
  }

  if (category === 'measurement') {
    return preferences.measurementEnabled;
  }

  return preferences.sleepEnabled;
}
