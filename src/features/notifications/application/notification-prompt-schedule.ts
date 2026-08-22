export interface NotificationPromptState {
  dismissals: number;
  nextEligibleAt?: string;
}

export const notificationPromptLimit = 3;
export const notificationPromptDelayMilliseconds = 7 * 24 * 60 * 60 * 1000;

export function shouldShowNotificationPrompt(
  state: NotificationPromptState,
  now: Date,
): boolean {
  if (state.dismissals >= notificationPromptLimit) {
    return false;
  }

  return !state.nextEligibleAt || Date.parse(state.nextEligibleAt) <= now.getTime();
}

export function postponeNotificationPrompt(
  state: NotificationPromptState,
  now: Date,
): NotificationPromptState {
  const dismissals = Math.min(state.dismissals + 1, notificationPromptLimit);

  return {
    dismissals,
    nextEligibleAt: dismissals < notificationPromptLimit
      ? new Date(now.getTime() + notificationPromptDelayMilliseconds).toISOString()
      : undefined,
  };
}
