export interface DailyCareSummary {
  diaper: {
    both: number;
    dirty: number;
    total: number;
    wet: number;
  };
  feeding: {
    averageIntervalMinutes?: number;
    count: number;
    knownAmountCount: number;
    totalAmountMilliliters: number;
  };
  latestMeasurement?: {
    headCircumferenceMillimeters?: number;
    lengthMillimeters?: number;
    measuredAt: string;
    source?: string;
    weightGrams?: number;
  };
  noteCount: number;
  sleepMinutes: number;
}

export interface DailyCareSummaryRange {
  endAt: string;
  startAt: string;
}

export function createLocalDayRange(now = new Date()): DailyCareSummaryRange {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  return { endAt: end.toISOString(), startAt: start.toISOString() };
}

export function formatSummaryDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}
