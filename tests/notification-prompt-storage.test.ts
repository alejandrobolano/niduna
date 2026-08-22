import { describe, expect, it, vi } from 'vitest';

import {
  loadNotificationPromptState,
  saveNotificationPromptState,
} from '../src/features/notifications/infrastructure/notification-prompt-storage';

describe('notification prompt storage', () => {
  it('keeps reminders separate for each signed-in user', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };

    saveNotificationPromptState('user-1', { dismissals: 1 }, storage);

    expect(storage.setItem).toHaveBeenCalledWith(
      'niduna.notification-prompt.user-1',
      JSON.stringify({ dismissals: 1 }),
    );
  });

  it('ignores invalid stored values', () => {
    const storage = {
      getItem: vi.fn(() => JSON.stringify({ dismissals: 'many' })),
      setItem: vi.fn(),
    };

    expect(loadNotificationPromptState('user-1', storage)).toEqual({ dismissals: 0 });
  });
});
