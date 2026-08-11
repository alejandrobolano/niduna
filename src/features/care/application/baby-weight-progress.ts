import type { WeightMeasurement } from '@/features/care/domain/care-event';

export interface BabyWeightProgress {
  currentWeightGrams: number;
  differenceGrams: number;
}

function hasValidWeight(
  measurement: WeightMeasurement,
): measurement is WeightMeasurement & { weightGrams: number } {
  return measurement.weightGrams !== undefined &&
    Number.isFinite(measurement.weightGrams);
}

export function getBabyWeightProgress(
  measurements: WeightMeasurement[],
  now: Date,
): BabyWeightProgress | undefined {
  const validMeasurements = measurements
    .filter(hasValidWeight)
    .filter(
      (measurement) => Date.parse(measurement.occurredAt) <= now.getTime(),
    );
  const birthMeasurement = validMeasurements.find(
    (measurement) => measurement.source === 'birth',
  );

  if (!birthMeasurement) {
    return undefined;
  }

  const latestMeasurement = validMeasurements
    .filter(
      (measurement) =>
        measurement.source !== 'birth' &&
        Date.parse(measurement.occurredAt) >
          Date.parse(birthMeasurement.occurredAt),
    )
    .sort(
      (left, right) =>
        Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
    )[0];

  if (!latestMeasurement) {
    return undefined;
  }

  return {
    currentWeightGrams: latestMeasurement.weightGrams,
    differenceGrams:
      latestMeasurement.weightGrams - birthMeasurement.weightGrams,
  };
}
