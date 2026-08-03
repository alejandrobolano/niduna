import { BabyIcon, Milk, Moon } from 'lucide-react-native';
import { describe, expect, it } from 'vitest';

import {
  getCareSnapshot,
  getDurationMinutes,
} from '../src/features/care/application/care-snapshot';
import type { CareEvent } from '../src/features/care/domain/care-event';

const events: CareEvent[] = [
  {
    babyId: 'baby-1',
    condition: 'wet',
    icon: BabyIcon,
    id: 'diaper-old',
    occurredAt: '2026-07-29T08:00:00.000Z',
    type: 'diaper',
  },
  {
    babyId: 'baby-1',
    condition: 'both',
    icon: BabyIcon,
    id: 'diaper-new',
    occurredAt: '2026-07-29T11:00:00.000Z',
    type: 'diaper',
  },
  {
    babyId: 'baby-1',
    icon: Milk,
    id: 'feeding',
    method: 'breast',
    occurredAt: '2026-07-29T10:30:00.000Z',
    type: 'feeding',
  },
  {
    babyId: 'baby-1',
    endedAt: '2026-07-29T10:00:00.000Z',
    icon: Moon,
    id: 'sleep-finished',
    occurredAt: '2026-07-29T09:00:00.000Z',
    type: 'sleep',
  },
  {
    babyId: 'baby-1',
    icon: Moon,
    id: 'sleep-open',
    occurredAt: '2026-07-29T12:00:00.000Z',
    type: 'sleep',
  },
];

describe('getCareSnapshot', () => {
  it('selects the latest relevant event and the open sleep', () => {
    const snapshot = getCareSnapshot(events);

    expect(snapshot.latestDiaper?.id).toBe('diaper-new');
    expect(snapshot.latestFeeding?.id).toBe('feeding');
    expect(snapshot.latestFinishedSleep?.id).toBe('sleep-finished');
    expect(snapshot.openSleep?.id).toBe('sleep-open');
  });
});

describe('getDurationMinutes', () => {
  it('rounds a duration to the nearest minute', () => {
    expect(
      getDurationMinutes(
        '2026-07-29T09:00:00.000Z',
        '2026-07-29T10:14:40.000Z',
      ),
    ).toBe(75);
  });

  it('never returns a negative duration', () => {
    expect(
      getDurationMinutes(
        '2026-07-29T10:00:00.000Z',
        '2026-07-29T09:00:00.000Z',
      ),
    ).toBe(0);
  });
});
