export type NotificationCategory = 'diaper' | 'feeding' | 'sleep';

export interface NotificationPreferences {
  diaperEnabled: boolean;
  feedingEnabled: boolean;
  pausedUntil?: string;
  sleepEnabled: boolean;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  diaperEnabled: true,
  feedingEnabled: true,
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

  return preferences.sleepEnabled;
}
