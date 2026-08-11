export type NotificationCategory =
  | 'diaper'
  | 'feeding'
  | 'measurement'
  | 'note'
  | 'sleep'
  | 'story';

export interface NotificationPreferences {
  diaperEnabled: boolean;
  feedingEnabled: boolean;
  measurementEnabled: boolean;
  noteEnabled: boolean;
  pausedUntil?: string;
  sleepEnabled: boolean;
  storyEnabled: boolean;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  diaperEnabled: true,
  feedingEnabled: true,
  measurementEnabled: true,
  noteEnabled: true,
  sleepEnabled: true,
  storyEnabled: true,
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

  if (category === 'story') {
    return preferences.storyEnabled;
  }

  return preferences.sleepEnabled;
}
