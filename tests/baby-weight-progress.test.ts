import { describe, expect, it } from 'vitest';

import { getBabyWeightProgress } from '../src/features/care/application/baby-weight-progress';
import type { WeightMeasurement } from '../src/features/care/domain/care-event';

const birthMeasurement: WeightMeasurement = {
  occurredAt: '2026-08-01T08:00:00.000Z',
  source: 'birth',
  weightGrams: 4000,
};
const now = new Date('2026-08-11T12:00:00.000Z');

describe('getBabyWeightProgress', () => {
  it('compares the latest later weight with the birth weight', () => {
    expect(
      getBabyWeightProgress(
        [
          birthMeasurement,
          {
            occurredAt: '2026-08-05T08:00:00.000Z',
            source: 'home',
            weightGrams: 4200,
          },
          {
            occurredAt: '2026-08-10T08:00:00.000Z',
            source: 'pediatrician',
            weightGrams: 4500,
          },
        ],
        now,
      ),
    ).toEqual({ currentWeightGrams: 4500, differenceGrams: 500 });
  });

  it('keeps negative and unchanged differences neutral', () => {
    expect(
      getBabyWeightProgress(
        [
          birthMeasurement,
          {
            occurredAt: '2026-08-05T08:00:00.000Z',
            source: 'hospital',
            weightGrams: 3800,
          },
        ],
        now,
      ),
    ).toEqual({ currentWeightGrams: 3800, differenceGrams: -200 });

    expect(
      getBabyWeightProgress(
        [
          birthMeasurement,
          {
            occurredAt: '2026-08-05T08:00:00.000Z',
            source: 'hospital',
            weightGrams: 4000,
          },
        ],
        now,
      ),
    ).toEqual({ currentWeightGrams: 4000, differenceGrams: 0 });
  });

  it('ignores future records and measurements without weight', () => {
    expect(
      getBabyWeightProgress(
        [
          birthMeasurement,
          {
            occurredAt: '2026-08-08T08:00:00.000Z',
            source: 'home',
            weightGrams: 4300,
          },
          {
            occurredAt: '2026-08-10T08:00:00.000Z',
            source: 'home',
          },
          {
            occurredAt: '2026-08-12T08:00:00.000Z',
            source: 'home',
            weightGrams: 4600,
          },
        ],
        now,
      ),
    ).toEqual({ currentWeightGrams: 4300, differenceGrams: 300 });
  });

  it('returns no progress without both required references', () => {
    expect(getBabyWeightProgress([birthMeasurement], now)).toBeUndefined();
    expect(
      getBabyWeightProgress(
        [{
          occurredAt: '2026-08-10T08:00:00.000Z',
          source: 'home',
          weightGrams: 4500,
        }],
        now,
      ),
    ).toBeUndefined();
  });
});
