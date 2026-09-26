const quarterHourMinutes = 15;
const millisecondsPerMinute = 60_000;

export interface FeedingRhythmEstimate {
  averageIntervalMinutes: number;
  feedingCount: number;
  rangeEndAt: Date;
  rangeStartAt: Date;
}

interface FeedingRhythmEstimateInput {
  averageIntervalMinutes?: number;
  feedingCount: number;
  latestFeedingAt?: string;
}

function floorToQuarterHour(value: Date): Date {
  const result = new Date(value);
  result.setSeconds(0, 0);
  result.setMinutes(
    Math.floor(result.getMinutes() / quarterHourMinutes) * quarterHourMinutes,
  );
  return result;
}

export function createFeedingRhythmEstimate({
  averageIntervalMinutes,
  feedingCount,
  latestFeedingAt,
}: FeedingRhythmEstimateInput): FeedingRhythmEstimate | undefined {
  if (
    feedingCount < 3 ||
    !averageIntervalMinutes ||
    averageIntervalMinutes <= 0 ||
    !latestFeedingAt
  ) {
    return undefined;
  }

  const latestFeedingTime = Date.parse(latestFeedingAt);
  if (Number.isNaN(latestFeedingTime)) return undefined;

  const predictedAt = new Date(
    latestFeedingTime + averageIntervalMinutes * millisecondsPerMinute,
  );
  const rangeStartAt = floorToQuarterHour(predictedAt);

  return {
    averageIntervalMinutes,
    feedingCount,
    rangeEndAt: new Date(
      rangeStartAt.getTime() + quarterHourMinutes * millisecondsPerMinute,
    ),
    rangeStartAt,
  };
}

export function isFeedingRhythmEstimatePast(
  estimate: FeedingRhythmEstimate,
  now: Date,
): boolean {
  return estimate.rangeEndAt.getTime() <= now.getTime();
}
