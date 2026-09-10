export const careEntryMinuteOffsets = [5, 10, 15, 30] as const;

export type CareEntryMinuteOffset = (typeof careEntryMinuteOffsets)[number];

export type CareEntryTimeSelection =
  | { kind: 'now' }
  | { kind: 'offset'; minutesAgo: CareEntryMinuteOffset; referenceAt: string }
  | { hour: number; kind: 'custom'; minute: number; referenceAt: string };

const maximumLookbackMilliseconds = 24 * 60 * 60 * 1000;

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
    occurrence.setDate(occurrence.getDate() - 1);
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
    timestamp >= now.getTime() - maximumLookbackMilliseconds
  );
}
