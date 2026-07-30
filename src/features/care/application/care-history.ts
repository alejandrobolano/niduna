import type { CareEvent } from '../domain/care-event';

export type CareEventFilter = 'all' | CareEvent['type'];

export interface CalendarDay {
  dateKey: string;
  day: number;
  eventTypes: CareEvent['type'][];
  isCurrentMonth: boolean;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export function toLocalDateKey(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function filterCareEvents(
  events: CareEvent[],
  filter: CareEventFilter,
  dateKey?: string,
): CareEvent[] {
  return events.filter(
    (event) =>
      (filter === 'all' || event.type === filter) &&
      (!dateKey || toLocalDateKey(event.occurredAt) === dateKey),
  );
}

export function buildMonthCalendar(
  year: number,
  month: number,
  events: CareEvent[],
): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const mondayBasedOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayBasedOffset);
  const eventTypesByDate = new Map<string, Set<CareEvent['type']>>();

  for (const event of events) {
    const dateKey = toLocalDateKey(event.occurredAt);
    const types = eventTypesByDate.get(dateKey) ?? new Set<CareEvent['type']>();
    types.add(event.type);
    eventTypesByDate.set(dateKey, types);
  }

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );
    const dateKey = toLocalDateKey(date);

    return {
      dateKey,
      day: date.getDate(),
      eventTypes: [...(eventTypesByDate.get(dateKey) ?? [])],
      isCurrentMonth:
        date.getFullYear() === year && date.getMonth() === month,
    };
  });
}
