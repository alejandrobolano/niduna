import type {
  CareEvent,
  DiaperEvent,
  FeedingEvent,
  MeasurementEvent,
  SleepEvent,
} from '@/features/care/domain/care-event';

export interface CareSnapshot {
  latestDiaper?: DiaperEvent;
  latestFeeding?: FeedingEvent;
  latestFinishedSleep?: SleepEvent;
  latestMeasurement?: MeasurementEvent;
  openSleep?: SleepEvent;
}

function isLater(left: CareEvent, right: CareEvent): boolean {
  return Date.parse(left.occurredAt) > Date.parse(right.occurredAt);
}

function latest<T extends CareEvent>(events: T[]): T | undefined {
  return events.reduce<T | undefined>(
    (current, event) => (!current || isLater(event, current) ? event : current),
    undefined,
  );
}

export function getCareSnapshot(events: CareEvent[]): CareSnapshot {
  const sleepEvents = events.filter(
    (event): event is SleepEvent => event.type === 'sleep',
  );

  return {
    latestDiaper: latest(
      events.filter(
        (event): event is DiaperEvent => event.type === 'diaper',
      ),
    ),
    latestFeeding: latest(
      events.filter(
        (event): event is FeedingEvent => event.type === 'feeding',
      ),
    ),
    latestMeasurement: latest(
      events.filter(
        (event): event is MeasurementEvent => event.type === 'measurement',
      ),
    ),
    latestFinishedSleep: latest(
      sleepEvents.filter((event) => Boolean(event.endedAt)),
    ),
    openSleep: latest(sleepEvents.filter((event) => !event.endedAt)),
  };
}

export function getDurationMinutes(start: string, end: string): number {
  return Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60_000));
}
