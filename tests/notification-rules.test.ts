import { describe, expect, it } from 'vitest';

import {
  selectEligibleCareDevices,
  shouldNotifyCareFollower,
} from '../supabase/functions/_shared/notification-rules';

const enabledPreference = {
  diaper_enabled: true,
  feeding_enabled: true,
  paused_until: null,
  sleep_enabled: true,
};

describe('care notification recipient rules', () => {
  it('never notifies the person who created the care event', () => {
    expect(
      shouldNotifyCareFollower({
        actorUserId: 'same-user',
        eventType: 'feeding',
        hasActiveDevice: true,
        isActiveFollower: true,
        now: new Date('2026-08-02T12:00:00Z'),
        preference: enabledPreference,
        recipientUserId: 'same-user',
      }),
    ).toBe(false);
  });

  it('excludes removed members and people who stopped following the baby', () => {
    expect(
      shouldNotifyCareFollower({
        actorUserId: 'actor',
        eventType: 'diaper',
        hasActiveDevice: true,
        isActiveFollower: false,
        now: new Date('2026-08-02T12:00:00Z'),
        preference: enabledPreference,
        recipientUserId: 'recipient',
      }),
    ).toBe(false);
  });

  it('respects category preferences without affecting other categories', () => {
    const preference = { ...enabledPreference, feeding_enabled: false };
    const baseInput = {
      actorUserId: 'actor',
      hasActiveDevice: true,
      isActiveFollower: true,
      now: new Date('2026-08-02T12:00:00Z'),
      preference,
      recipientUserId: 'recipient',
    };

    expect(
      shouldNotifyCareFollower({ ...baseInput, eventType: 'feeding' }),
    ).toBe(false);
    expect(
      shouldNotifyCareFollower({ ...baseInput, eventType: 'diaper' }),
    ).toBe(true);
  });

  it('keeps every active device for a recipient and excludes every author device', () => {
    const devices = [
      { id: 'author-phone', user_id: 'author' },
      { id: 'author-browser', user_id: 'author' },
      { id: 'recipient-phone', user_id: 'recipient' },
      { id: 'recipient-browser', user_id: 'recipient' },
    ];

    expect(
      selectEligibleCareDevices({
        actorUserId: 'author',
        devices,
        eventType: 'feeding',
        now: new Date('2026-08-02T12:00:00Z'),
        preferencesByUser: new Map([['recipient', enabledPreference]]),
      }),
    ).toEqual([devices[2], devices[3]]);
  });

  it('honors a temporary pause and resumes afterwards', () => {
    const preference = {
      ...enabledPreference,
      paused_until: '2026-08-02T16:00:00Z',
    };
    const input = {
      actorUserId: 'actor',
      eventType: 'sleep' as const,
      hasActiveDevice: true,
      isActiveFollower: true,
      preference,
      recipientUserId: 'recipient',
    };

    expect(
      shouldNotifyCareFollower({
        ...input,
        now: new Date('2026-08-02T12:00:00Z'),
      }),
    ).toBe(false);
    expect(
      shouldNotifyCareFollower({
        ...input,
        now: new Date('2026-08-02T17:00:00Z'),
      }),
    ).toBe(true);
  });
});
