import { BabyIcon, Milk } from 'lucide-react-native';
import { describe, expect, it, vi } from 'vitest';
import {
  buildMonthCalendar,
  filterCareEvents,
  paginateCareEvents,
  toLocalDateKey,
} from '../src/features/care/application/care-history';
import {
  createCareHistoryCsv,
  createCareHistoryFileName,
} from '../src/features/care/application/care-history-csv';
import type { CareEvent } from '../src/features/care/domain/care-event';

vi.mock('lucide-react-native', () => ({
  BabyIcon: 'BabyIcon',
  Milk: 'Milk',
}));

const events: CareEvent[] = [
  {
    babyId: 'baby-1',
    icon: Milk,
    id: 'feeding-1',
    method: 'formula',
    notes: '=unsafe formula',
    occurredAt: '2026-07-29T10:30:00',
    recordedByName: 'Alex',
    type: 'feeding',
  },
  {
    babyId: 'baby-1',
    condition: 'wet',
    icon: BabyIcon,
    id: 'diaper-1',
    occurredAt: '2026-07-30T08:00:00',
    type: 'diaper',
  },
];

describe('care history filters', () => {
  it('filters by event type and local date', () => {
    expect(filterCareEvents(events, 'feeding')).toHaveLength(1);
    expect(
      filterCareEvents(events, 'all', toLocalDateKey(events[1].occurredAt)),
    ).toEqual([events[1]]);
  });

  it('builds a Monday-first calendar with event markers', () => {
    const calendar = buildMonthCalendar(2026, 6, events);
    const eventDay = calendar.find(
      (day) => day.dateKey === toLocalDateKey(events[0].occurredAt),
    );

    expect(calendar).toHaveLength(42);
    expect(calendar[0].dateKey).toBe('2026-06-29');
    expect(eventDay?.eventTypes).toContain('feeding');
  });

  it('paginates filtered results with a bounded page', () => {
    const repeatedEvents = Array.from({ length: 45 }, (_, index) => ({
      ...events[0],
      id: `feeding-${index}`,
    }));
    const result = paginateCareEvents(repeatedEvents, 3, 20);

    expect(result.events).toHaveLength(5);
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(3);
  });
});

describe('care history CSV', () => {
  it('uses Excel-friendly columns and protects formula injection', () => {
    const csv = createCareHistoryCsv(events);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Fecha";"Hora";"Tipo"');
    expect(csv).toContain(`"'=unsafe formula"`);
  });

  it('creates a stable and safe filename', () => {
    expect(
      createCareHistoryFileName('Lucía ♥', new Date(2026, 6, 30)),
    ).toBe('niduna-lucia-2026-07-30.csv');
  });
});
