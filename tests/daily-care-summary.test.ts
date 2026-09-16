import { describe, expect, it } from 'vitest';

import {
  compareCareSummaries,
  createCareSummaryRange,
  createPreviousCareSummaryRange,
  formatSummaryDuration,
  summarizeCareTrend,
  summarizeMeasurementEvolution,
} from '../src/features/care-summary/domain/daily-care-summary';
import { createCareSummaryObservations } from '../src/features/care-summary/application/care-summary-observations';

const emptySummary = {
  diaper: { both: 0, dirty: 0, total: 0, wet: 0 },
  feeding: { count: 0, knownAmountCount: 0, totalAmountMilliliters: 0 },
  noteCount: 0,
  sleepMinutes: 0,
};

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

  it('creates the immediately preceding range with exactly the same duration', () => {
    const current = createCareSummaryRange('7d', new Date('2026-09-16T14:30:00.000Z'));
    const previous = createPreviousCareSummaryRange(current);
    const currentDuration = Date.parse(current.endAt) - Date.parse(current.startAt);

    expect(previous.endAt).toBe(current.startAt);
    expect(Date.parse(previous.endAt) - Date.parse(previous.startAt)).toBe(currentDuration);
    expect(previous.bucketMinutes).toBe(current.bucketMinutes);
  });

  it('rejects an invalid range before comparing periods', () => {
    expect(() => createPreviousCareSummaryRange({
      bucketMinutes: 240,
      endAt: '2026-09-16T10:00:00.000Z',
      startAt: '2026-09-16T10:00:00.000Z',
    })).toThrow('invalid_care_summary_range');
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

  it('compares the current summary with the preceding period without percentages', () => {
    const comparison = compareCareSummaries({
      diaper: { both: 1, dirty: 1, total: 5, wet: 3 },
      feeding: {
        averageIntervalMinutes: 180,
        count: 6,
        knownAmountCount: 4,
        totalAmountMilliliters: 360,
      },
      noteCount: 1,
      sleepMinutes: 240,
    }, {
      diaper: { both: 0, dirty: 1, total: 3, wet: 2 },
      feeding: {
        averageIntervalMinutes: 210,
        count: 4,
        knownAmountCount: 3,
        totalAmountMilliliters: 240,
      },
      noteCount: 2,
      sleepMinutes: 180,
    });

    expect(comparison.feedingCount.delta).toBe(2);
    expect(comparison.diaperCount.delta).toBe(2);
    expect(comparison.sleepMinutes.delta).toBe(60);
    expect(comparison.feedingIntervalMinutes?.delta).toBe(-30);
    expect(createCareSummaryObservations(comparison)).toEqual([
      'Se registraron 2 tomas más que en el periodo anterior.',
      'Se registraron 2 cambios de pañal más que en el periodo anterior.',
      'Se registraron 1 h de sueño más que en el periodo anterior.',
      'En las tomas con cantidad indicada se registraron 120 ml más.',
    ]);
  });

  it('does not infer care activity when both periods are empty', () => {
    const comparison = compareCareSummaries(emptySummary, emptySummary);

    expect(createCareSummaryObservations(comparison)).toEqual([
      'Aún no hay suficientes registros en ambos periodos para compararlos.',
    ]);
  });

  it('does not compare feeding amounts when either period has no known quantities', () => {
    const comparison = compareCareSummaries({
      ...emptySummary,
      feeding: { count: 2, knownAmountCount: 0, totalAmountMilliliters: 0 },
    }, {
      ...emptySummary,
      feeding: { count: 2, knownAmountCount: 2, totalAmountMilliliters: 120 },
    });

    expect(createCareSummaryObservations(comparison)).toEqual([
      'Los totales registrados se mantienen iguales al periodo anterior.',
    ]);
  });
});
