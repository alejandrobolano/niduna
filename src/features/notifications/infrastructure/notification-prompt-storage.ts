import type { NotificationPromptState } from '@/features/notifications/application/notification-prompt-schedule';

interface NotificationPromptStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const emptyState: NotificationPromptState = { dismissals: 0 };

function getStorageKey(userId: string): string {
  return `niduna.notification-prompt.${userId}`;
}

function isNotificationPromptState(value: unknown): value is NotificationPromptState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Partial<NotificationPromptState>;

  return Number.isInteger(state.dismissals) &&
    Number(state.dismissals) >= 0 &&
    (!state.nextEligibleAt || !Number.isNaN(Date.parse(state.nextEligibleAt)));
}

export function loadNotificationPromptState(
  userId: string,
  storage: NotificationPromptStorage | undefined = globalThis.localStorage,
): NotificationPromptState {
  try {
    const raw = storage?.getItem(getStorageKey(userId));

    if (!raw) {
      return emptyState;
    }

    const value: unknown = JSON.parse(raw);
    return isNotificationPromptState(value) ? value : emptyState;
  } catch {
    return emptyState;
  }
}

export function saveNotificationPromptState(
  userId: string,
  state: NotificationPromptState,
  storage: NotificationPromptStorage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch {
    return;
  }
}
