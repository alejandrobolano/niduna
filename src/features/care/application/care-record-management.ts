import type { CareEvent } from '@/features/care/domain/care-event';

export function getCareRecordKey(event: CareEvent): string {
  return `${event.sourceType}:${event.id}`;
}

export function getSelectableCareRecordKeys(events: CareEvent[]): Set<string> {
  return new Set(
    events
      .filter((event) => !(event.type === 'measurement' && event.source === 'birth'))
      .map(getCareRecordKey),
  );
}

export function reconcileCareRecordSelection(
  selectedKeys: ReadonlySet<string>,
  visibleEvents: CareEvent[],
): Set<string> {
  const visibleKeys = new Set(visibleEvents.map(getCareRecordKey));
  return new Set([...selectedKeys].filter((key) => visibleKeys.has(key)));
}

export function canEditCareRecord(
  event: CareEvent,
  userId: string,
  canManage: boolean,
  canRecord: boolean,
): boolean {
  return (
    canRecord &&
    (canManage || event.recordedById === userId) &&
    !(event.type === 'measurement' && event.source === 'birth')
  );
}

export function replaceCareRecordOccurrence(
  event: CareEvent,
  date: string,
  hour: string,
  minute: string,
): CareEvent {
  const [year, month, day] = date.split('-').map(Number);
  const occurredAt = new Date(
    year,
    month - 1,
    day,
    Number(hour),
    Number(minute),
  ).toISOString();

  return { ...event, occurredAt };
}
