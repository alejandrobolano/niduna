import { describe, expect, it } from 'vitest';

import {
  getCareRecordRetention,
  RETIRED_CARE_RETENTION_DAYS,
} from '../src/features/care/application/care-record-retention';

const now = new Date('2026-08-14T12:00:00.000Z');

describe('care record retention', () => {
  it('keeps a newly retired record recoverable for 30 days', () => {
    expect(getCareRecordRetention('2026-08-14T12:00:00.000Z', now)).toEqual({
      daysRemaining: RETIRED_CARE_RETENTION_DAYS,
      expiresAt: '2026-09-13T12:00:00.000Z',
      isExpired: false,
    });
  });

  it('rounds a partial final day up for the user-facing deadline', () => {
    expect(
      getCareRecordRetention('2026-07-15T13:00:00.000Z', now),
    ).toMatchObject({
      daysRemaining: 1,
      isExpired: false,
    });
  });

  it('marks the record as expired at the exact 30-day boundary', () => {
    expect(
      getCareRecordRetention('2026-07-15T12:00:00.000Z', now),
    ).toMatchObject({
      daysRemaining: 0,
      isExpired: true,
    });
  });

  it('returns no policy for active or malformed records', () => {
    expect(getCareRecordRetention(undefined, now)).toBeUndefined();
    expect(getCareRecordRetention('not-a-date', now)).toBeUndefined();
  });
});
