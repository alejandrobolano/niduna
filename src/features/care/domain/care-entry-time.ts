export const careEntryMinuteOffsets = [5, 10, 15, 30] as const;
export const careEntryMaximumLookbackMinutes = 120;

export type CareEntryMinuteOffset = (typeof careEntryMinuteOffsets)[number];

export type CareEntryTimeSelection =
  | { kind: 'now' }
  | { kind: 'offset'; minutesAgo: CareEntryMinuteOffset; referenceAt: string }
  | { hour: number; kind: 'custom'; minute: number; referenceAt: string };

export interface CareEntryClockTime {
  hour: number;
  minute: number;
}

const minuteMilliseconds = 60 * 1000;
const maximumLookbackMilliseconds = careEntryMaximumLookbackMinutes * minuteMilliseconds;
const clockPrecisionToleranceMilliseconds = minuteMilliseconds - 1;

export function getCareEntryClockTimes(
  referenceAt: string | Date,
): CareEntryClockTime[] {
  const reference = typeof referenceAt === 'string' ? new Date(referenceAt) : referenceAt;

  if (!Number.isFinite(reference.getTime())) {
    return [];
  }

  const end = new Date(reference);
  end.setSeconds(0, 0);

  return Array.from(
    { length: careEntryMaximumLookbackMinutes + 1 },
    (_, index) => {
      const time = new Date(
        end.getTime() - (careEntryMaximumLookbackMinutes - index) * minuteMilliseconds,
      );
      return { hour: time.getHours(), minute: time.getMinutes() };
    },
  );
}

export function resolveCareEntryTime(
  selection: CareEntryTimeSelection,
  now = new Date(),
): Date {
  if (selection.kind === 'now') {
    return new Date(now);
  }

  if (selection.kind === 'offset') {
    return new Date(
      new Date(selection.referenceAt).getTime() - selection.minutesAgo * 60 * 1000,
    );
  }

  const occurrence = new Date(selection.referenceAt);
  occurrence.setHours(selection.hour, selection.minute, 0, 0);

  if (occurrence.getTime() > new Date(selection.referenceAt).getTime()) {
    const previousDayOccurrence = new Date(occurrence);
    previousDayOccurrence.setDate(previousDayOccurrence.getDate() - 1);

    if (
      new Date(selection.referenceAt).getTime() - previousDayOccurrence.getTime() <=
      maximumLookbackMilliseconds + clockPrecisionToleranceMilliseconds
    ) {
      return previousDayOccurrence;
    }
  }

  return occurrence;
}

export function isCareEntryTimeAllowed(
  occurredAt: string | Date,
  now = new Date(),
): boolean {
  const occurrence = typeof occurredAt === 'string' ? new Date(occurredAt) : occurredAt;
  const timestamp = occurrence.getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp <= now.getTime() &&
    timestamp >=
      now.getTime() - maximumLookbackMilliseconds - clockPrecisionToleranceMilliseconds
  );
}
