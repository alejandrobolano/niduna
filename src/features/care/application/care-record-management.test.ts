import { forwardRef } from 'react';
import { describe, expect, it } from 'vitest';

import type { SleepEvent } from '@/features/care/domain/care-event';

import {
  canEditCareRecord,
  isSleepEndTimeAllowed,
  replaceSleepInterval,
} from './care-record-management';

const TestIcon: SleepEvent['icon'] = forwardRef(function TestIcon() {
  return null;
});

const sleepEvent: SleepEvent = {
  babyId: 'baby-id',
  endedAt: '2026-10-01T14:43:00.000Z',
  icon: TestIcon,
  id: 'sleep-id',
  occurredAt: '2026-10-01T14:10:00.000Z',
  recordedById: 'user-id',
  sourceType: 'care_event',
  type: 'sleep',
};

describe('care record management', () => {
  it('updates both ends of a completed sleep interval', () => {
    const updated = replaceSleepInterval(
      sleepEvent,
      { date: '2026-10-01', hour: '23', minute: '40' },
      { date: '2026-10-02', hour: '00', minute: '25' },
    );

    expect(new Date(updated.endedAt ?? '').getTime() - new Date(updated.occurredAt).getTime())
      .toBe(45 * 60_000);
  });

  it('allows a sleep to end within the recent entry window and after its start', () => {
    const now = new Date('2026-10-01T15:00:00.000Z');

    expect(
      isSleepEndTimeAllowed(
        '2026-10-01T13:00:00.000Z',
        '2026-10-01T14:55:00.000Z',
        now,
      ),
    ).toBe(true);
  });

  it('rejects a sleep end before its start or outside the recent entry window', () => {
    const now = new Date('2026-10-01T15:00:00.000Z');

    expect(
      isSleepEndTimeAllowed(
        '2026-10-01T14:30:00.000Z',
        '2026-10-01T14:20:00.000Z',
        now,
      ),
    ).toBe(false);
    expect(
      isSleepEndTimeAllowed(
        '2026-10-01T10:00:00.000Z',
        '2026-10-01T12:30:00.000Z',
        now,
      ),
    ).toBe(false);
  });

  it('keeps care editing unavailable to read-only members', () => {
    expect(canEditCareRecord(sleepEvent, 'user-id', false, false)).toBe(false);
    expect(canEditCareRecord(sleepEvent, 'user-id', false, true)).toBe(true);
    expect(canEditCareRecord(sleepEvent, 'manager-id', true, true)).toBe(true);
  });
});
