import { Milk, NotebookPen, Scale } from 'lucide-react-native';
import { describe, expect, it, vi } from 'vitest';
import {
  InvalidCareEventError,
  mapBabyNote,
  mapCareEvent,
  mapCareTimelineRow,
  mapMeasurement,
} from '../src/features/care/infrastructure/supabase-care-event-mapper';
import type { Database } from '../src/shared/infrastructure/supabase/database.types';

vi.mock('lucide-react-native', () => ({
  BabyIcon: 'BabyIcon',
  Milk: 'Milk',
  Moon: 'Moon',
  NotebookPen: 'NotebookPen',
  Scale: 'Scale',
}));

type CareEventRow = Database['public']['Tables']['care_events']['Row'];
type BabyNoteRow = Database['public']['Tables']['baby_notes']['Row'];
type MeasurementRow = Database['public']['Tables']['baby_measurements']['Row'];

const baseRow: CareEventRow = {
  amount_milliliters: null,
  baby_id: 'baby-1',
  breast_side: null,
  created_at: '2026-07-29T10:00:00.000Z',
  deleted_at: null,
  deleted_by: null,
  diaper_condition: null,
  ended_at: null,
  event_type: 'feeding',
  feeding_method: 'breast',
  id: 'event-1',
  notes: '  Comió tranquila  ',
  occurred_at: '2026-07-29T10:00:00.000Z',
  recorded_by: 'user-1',
  updated_at: '2026-07-29T10:00:00.000Z',
  updated_by: 'user-1',
};

describe('mapCareEvent', () => {
  it('maps a feeding and resolves its recorder name', () => {
    expect(
      mapCareEvent(baseRow, new Map([['user-1', 'Alejandro']])),
    ).toEqual({
      amountMilliliters: undefined,
      babyId: 'baby-1',
      breastSide: undefined,
      icon: Milk,
      id: 'event-1',
      method: 'breast',
      notes: 'Comió tranquila',
      occurredAt: '2026-07-29T10:00:00.000Z',
      recordedById: 'user-1',
      recordedByName: 'Alejandro',
      sourceType: 'care_event',
      type: 'feeding',
    });
  });

  it('rejects a malformed feeding from the external boundary', () => {
    expect(() =>
      mapCareEvent(
        { ...baseRow, feeding_method: null },
        new Map<string, string>(),
      ),
    ).toThrow(InvalidCareEventError);
  });
});

describe('additional timeline mappers', () => {
  it('maps a unified timeline row for server pagination', () => {
    expect(
      mapCareTimelineRow(
        {
          amount_milliliters: 90,
          baby_id: 'baby-1',
          breast_side: null,
          content: null,
          diaper_condition: null,
          deleted_at: null,
          deleted_by: null,
          ended_at: null,
          event_type: 'feeding',
          feeding_method: 'formula',
          head_circumference_millimeters: null,
          id: 'timeline-1',
          length_millimeters: null,
          measurement_source: null,
          notes: null,
          occurred_at: '2026-08-09T10:00:00.000Z',
          recorded_by: 'user-1',
          source_type: 'care_event',
          updated_at: '2026-08-09T10:00:00.000Z',
          updated_by: 'user-1',
          weight_grams: null,
        },
        new Map([['user-1', 'Marta']]),
      ),
    ).toMatchObject({
      amountMilliliters: 90,
      recordedById: 'user-1',
      recordedByName: 'Marta',
      sourceType: 'care_event',
      type: 'feeding',
    });
  });

  it('maps a family note', () => {
    const row: BabyNoteRow = {
      baby_id: 'baby-1',
      content: 'Llamar a pediatría',
      created_at: '2026-08-09T10:00:00.000Z',
      deleted_at: null,
      deleted_by: null,
      id: 'note-1',
      occurred_at: '2026-08-09T10:00:00.000Z',
      recorded_by: 'user-1',
      updated_at: '2026-08-09T10:00:00.000Z',
      updated_by: 'user-1',
    };

    expect(mapBabyNote(row, new Map([['user-1', 'Marta']]))).toMatchObject({
      content: 'Llamar a pediatría',
      icon: NotebookPen,
      recordedByName: 'Marta',
      type: 'note',
    });
  });

  it('maps pediatric measurements using storage units', () => {
    const row: MeasurementRow = {
      baby_id: 'baby-1',
      created_at: '2026-08-09T10:00:00.000Z',
      deleted_at: null,
      deleted_by: null,
      head_circumference_millimeters: 375,
      id: 'measurement-1',
      length_millimeters: 542,
      measured_at: '2026-08-09T10:00:00.000Z',
      notes: 'Control rutinario',
      recorded_by: 'user-1',
      source: 'pediatrician',
      updated_at: '2026-08-09T10:00:00.000Z',
      updated_by: 'user-1',
      weight_grams: 4850,
    };

    expect(mapMeasurement(row, new Map())).toMatchObject({
      headCircumferenceMillimeters: 375,
      icon: Scale,
      lengthMillimeters: 542,
      source: 'pediatrician',
      type: 'measurement',
      weightGrams: 4850,
    });
  });
});
