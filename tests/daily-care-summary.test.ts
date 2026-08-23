import { describe, expect, it } from 'vitest';

import {
  createCareSummaryRange,
  formatSummaryDuration,
  summarizeCareTrend,
  summarizeMeasurementEvolution,
} from '../src/features/care-summary/domain/daily-care-summary';

describe('daily care summary', () => {
  it('creates a rolling 24-hour range split into four-hour buckets', () => {
    const now = new Date(2026, 7, 23, 14, 30);
    const range = createCareSummaryRange('24h', now);

    expect(new Date(range.endAt).getTime() - new Date(range.startAt).getTime()).toBe(24 * 60 * 60 * 1000);
    expect(range.bucketMinutes).toBe(240);
  });

  it('includes today in seven and thirty day ranges', () => {
    const now = new Date(2026, 7, 23, 14, 30);
    const sevenDays = createCareSummaryRange('7d', now);
    const thirtyDays = createCareSummaryRange('30d', now);

    expect(new Date(sevenDays.startAt).getDate()).toBe(17);
    expect(new Date(thirtyDays.startAt).getDate()).toBe(25);
    expect(sevenDays.bucketMinutes).toBe(1440);
    expect(thirtyDays.bucketMinutes).toBe(1440);
  });

  it('formats minutes without hiding partial hours', () => {
    expect(formatSummaryDuration(45)).toBe('45 min');
    expect(formatSummaryDuration(120)).toBe('2 h');
    expect(formatSummaryDuration(135)).toBe('2 h 15 min');
  });

  it('describes care trends without relying on the chart', () => {
    expect(summarizeCareTrend({
      diaper: { both: 0, dirty: 1, total: 3, wet: 2 },
      feeding: { count: 4, knownAmountCount: 2, totalAmountMilliliters: 180 },
      noteCount: 1,
      sleepMinutes: 135,
    }, '24h')).toBe(
      'En las últimas 24 horas se registraron 4 tomas, 3 cambios de pañal, 2 h 15 min de sueño registrado y 1 nota.',
    );
  });

  it('describes weight evolution from the first to the latest measure', () => {
    expect(summarizeMeasurementEvolution([
      { measuredAt: '2026-08-01T00:00:00.000Z', weightGrams: 3200 },
      { measuredAt: '2026-08-20T00:00:00.000Z', weightGrams: 3650 },
    ])).toContain('450 g por encima');
  });
});
