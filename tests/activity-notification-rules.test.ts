import { describe, expect, it } from 'vitest';

import { shouldNotifyActivityFollower } from '../supabase/functions/_shared/activity-notification-rules';

const enabledPreference = {
  measurement_enabled: true,
  note_enabled: true,
  paused_until: null,
};

describe('activity notification recipient rules', () => {
  it('never notifies the person who created the activity', () => {
    expect(
      shouldNotifyActivityFollower({
        actorUserId: 'same-user',
        category: 'note',
        hasActiveDevice: true,
        isActiveFollower: true,
        now: new Date('2026-08-09T12:00:00Z'),
        preference: enabledPreference,
        recipientUserId: 'same-user',
      }),
    ).toBe(false);
  });

  it('respects note and measurement preferences independently', () => {
    const preference = { ...enabledPreference, note_enabled: false };
    const input = {
      actorUserId: 'actor',
      hasActiveDevice: true,
      isActiveFollower: true,
      now: new Date('2026-08-09T12:00:00Z'),
      preference,
      recipientUserId: 'recipient',
    };

    expect(
      shouldNotifyActivityFollower({ ...input, category: 'note' }),
    ).toBe(false);
    expect(
      shouldNotifyActivityFollower({ ...input, category: 'measurement' }),
    ).toBe(true);
  });

  it('honors the family notification pause', () => {
    expect(
      shouldNotifyActivityFollower({
        actorUserId: 'actor',
        category: 'measurement',
        hasActiveDevice: true,
        isActiveFollower: true,
        now: new Date('2026-08-09T12:00:00Z'),
        preference: {
          ...enabledPreference,
          paused_until: '2026-08-09T16:00:00Z',
        },
        recipientUserId: 'recipient',
      }),
    ).toBe(false);
  });
});
