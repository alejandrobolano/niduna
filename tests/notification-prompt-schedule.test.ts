import { describe, expect, it } from 'vitest';

import {
  notificationPromptDelayMilliseconds,
  postponeNotificationPrompt,
  shouldShowNotificationPrompt,
} from '../src/features/notifications/application/notification-prompt-schedule';

const now = new Date('2026-08-21T10:00:00.000Z');

describe('notification prompt schedule', () => {
  it('shows the first prompt immediately', () => {
    expect(shouldShowNotificationPrompt({ dismissals: 0 }, now)).toBe(true);
  });

  it('waits seven days after a dismissal', () => {
    const postponed = postponeNotificationPrompt({ dismissals: 0 }, now);

    expect(shouldShowNotificationPrompt(postponed, now)).toBe(false);
    expect(
      shouldShowNotificationPrompt(
        postponed,
        new Date(now.getTime() + notificationPromptDelayMilliseconds),
      ),
    ).toBe(true);
  });

  it('stops after the third dismissal', () => {
    const state = postponeNotificationPrompt({ dismissals: 2 }, now);

    expect(state).toEqual({ dismissals: 3, nextEligibleAt: undefined });
    expect(
      shouldShowNotificationPrompt(
        state,
        new Date(now.getTime() + notificationPromptDelayMilliseconds * 10),
      ),
    ).toBe(false);
  });
});
