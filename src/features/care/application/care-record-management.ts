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

export function refreshCareRecordSelection(
  selection: ReadonlyMap<string, CareEvent>,
  visibleEvents: CareEvent[],
  babyId: string,
): Map<string, CareEvent> {
  const next = new Map(
    [...selection].filter(([, event]) => event.babyId === babyId),
  );

  visibleEvents.forEach((event) => {
    const key = getCareRecordKey(event);
    if (next.has(key)) next.set(key, event);
  });

  return next;
}

export function toggleCareRecordSelection(
  selection: ReadonlyMap<string, CareEvent>,
  event: CareEvent,
): Map<string, CareEvent> {
  const next = new Map(selection);
  const key = getCareRecordKey(event);

  if (next.has(key)) next.delete(key);
  else next.set(key, event);

  return next;
}

export function toggleVisibleCareRecordSelection(
  selection: ReadonlyMap<string, CareEvent>,
  visibleEvents: CareEvent[],
): Map<string, CareEvent> {
  const selectableEvents = visibleEvents.filter(
    (event) => !(event.type === 'measurement' && event.source === 'birth'),
  );
  const allVisibleSelected = selectableEvents.length > 0 && selectableEvents.every(
    (event) => selection.has(getCareRecordKey(event)),
  );
  const next = new Map(selection);

  selectableEvents.forEach((event) => {
    const key = getCareRecordKey(event);
    if (allVisibleSelected) next.delete(key);
    else next.set(key, event);
  });

  return next;
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
