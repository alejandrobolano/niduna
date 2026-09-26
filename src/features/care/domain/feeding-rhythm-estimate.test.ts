import { describe, expect, it } from 'vitest';

import {
  createFeedingRhythmEstimate,
  isFeedingRhythmEstimatePast,
} from './feeding-rhythm-estimate';

describe('feeding rhythm estimate', () => {
  it('rounds the predicted feeding down to a fifteen-minute range', () => {
    const estimate = createFeedingRhythmEstimate({
      averageIntervalMinutes: 192,
      feedingCount: 6,
      latestFeedingAt: '2026-09-26T06:02:00.000Z',
    });

    expect(estimate?.rangeStartAt.toISOString()).toBe('2026-09-26T09:00:00.000Z');
    expect(estimate?.rangeEndAt.toISOString()).toBe('2026-09-26T09:15:00.000Z');
  });

  it('supports ranges that cross midnight', () => {
    const estimate = createFeedingRhythmEstimate({
      averageIntervalMinutes: 180,
      feedingCount: 4,
      latestFeedingAt: '2026-09-26T21:58:00.000Z',
    });

    expect(estimate?.rangeStartAt.toISOString()).toBe('2026-09-27T00:45:00.000Z');
    expect(estimate?.rangeEndAt.toISOString()).toBe('2026-09-27T01:00:00.000Z');
  });

  it('requires at least three feedings and a valid interval', () => {
    expect(createFeedingRhythmEstimate({
      averageIntervalMinutes: 180,
      feedingCount: 2,
      latestFeedingAt: '2026-09-26T10:00:00.000Z',
    })).toBeUndefined();
    expect(createFeedingRhythmEstimate({
      feedingCount: 5,
      latestFeedingAt: '2026-09-26T10:00:00.000Z',
    })).toBeUndefined();
  });

  it('detects when the complete estimate range has passed', () => {
    const estimate = createFeedingRhythmEstimate({
      averageIntervalMinutes: 180,
      feedingCount: 5,
      latestFeedingAt: '2026-09-26T06:00:00.000Z',
    });

    expect(estimate && isFeedingRhythmEstimatePast(
      estimate,
      new Date('2026-09-26T09:16:00.000Z'),
    )).toBe(true);
  });
});
