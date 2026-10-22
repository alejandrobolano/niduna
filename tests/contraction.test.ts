import { describe, expect, it } from 'vitest';

import {
  formatContractionInterval,
  formatTimer,
  getContractionDurationSeconds,
  getContractionIntervalSeconds,
  type Contraction,
} from '../src/features/contractions/domain/contraction';

const first: Contraction = {
  babyId: 'baby-id',
  endedAt: '2026-10-22T10:00:42.000Z',
  id: 'first',
  recordedBy: 'user-id',
  startedAt: '2026-10-22T10:00:00.000Z',
};

describe('contraction timing', () => {
  it('calculates a finished contraction duration', () => {
    expect(getContractionDurationSeconds(first, new Date())).toBe(42);
    expect(formatTimer(42)).toBe('00:42');
  });

  it('keeps an active contraction tied to its persisted start', () => {
    const active = { ...first, endedAt: undefined };
    expect(
      getContractionDurationSeconds(active, new Date('2026-10-22T10:02:03.000Z')),
    ).toBe(123);
    expect(formatTimer(123)).toBe('02:03');
  });

  it('calculates intervals from one start to the next', () => {
    const next = { ...first, id: 'next', startedAt: '2026-10-22T10:07:05.000Z' };
    const interval = getContractionIntervalSeconds(next, first);
    expect(interval).toBe(425);
    expect(formatContractionInterval(interval)).toBe('7 min 05 s desde la anterior');
  });
});
