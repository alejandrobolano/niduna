import { describe, expect, it } from 'vitest';

import {
  addMonths,
  dateToIso,
  formatDate,
  getCalendarDays,
  isoToDate,
} from '../src/shared/presentation/date';

describe('date presentation utilities', () => {
  it('round-trips an ISO date without timezone drift', () => {
    const date = isoToDate('2026-08-21');

    expect(date).toBeDefined();
    if (!date) {
      throw new Error('Expected a valid date.');
    }
    expect(dateToIso(date)).toBe('2026-08-21');
  });

  it('rejects impossible calendar dates', () => {
    expect(isoToDate('2026-02-30')).toBeUndefined();
  });

  it('formats dates in Spanish', () => {
    expect(formatDate('2026-08-21')).toBe('21 de agosto de 2026');
  });

  it('builds a six-week calendar starting on Monday', () => {
    const days = getCalendarDays(new Date(2026, 7, 1, 12));

    expect(days).toHaveLength(42);
    expect(days[0].isoDate).toBe('2026-07-27');
    expect(days[41].isoDate).toBe('2026-09-06');
  });

  it('moves between months without carrying an invalid day', () => {
    expect(dateToIso(addMonths(new Date(2026, 0, 31, 12), 1))).toBe('2026-02-01');
  });
});
