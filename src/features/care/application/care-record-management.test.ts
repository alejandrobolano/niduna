import { forwardRef } from 'react';
import { describe, expect, it } from 'vitest';

import type { SleepEvent } from '@/features/care/domain/care-event';

import { replaceSleepInterval } from './care-record-management';

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
});
