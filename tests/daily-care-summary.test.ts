import { describe, expect, it } from 'vitest';

import {
  createLocalDayRange,
  formatSummaryDuration,
} from '../src/features/care-summary/domain/daily-care-summary';

describe('daily care summary', () => {
  it('creates a range bounded to the current local day', () => {
    const now = new Date(2026, 7, 23, 14, 30);
    const range = createLocalDayRange(now);

    expect(new Date(range.startAt).getHours()).toBe(0);
    expect(new Date(range.startAt).getDate()).toBe(23);
    expect(new Date(range.endAt).getHours()).toBe(0);
    expect(new Date(range.endAt).getDate()).toBe(24);
  });

  it('formats minutes without hiding partial hours', () => {
    expect(formatSummaryDuration(45)).toBe('45 min');
    expect(formatSummaryDuration(120)).toBe('2 h');
    expect(formatSummaryDuration(135)).toBe('2 h 15 min');
  });
});
