import type {
  CareEvent,
  MeasurementEvent,
  NoteEvent,
  SleepEvent,
} from '@/features/care/domain/care-event';
import type { Database } from '@/shared/infrastructure/supabase/database.types';
import { BabyIcon, Milk, Moon, NotebookPen, Scale } from 'lucide-react-native';

type CareEventRow = Database['public']['Tables']['care_events']['Row'];
type BabyNoteRow = Database['public']['Tables']['baby_notes']['Row'];
type MeasurementRow = Database['public']['Tables']['baby_measurements']['Row'];
export type CareTimelineRow =
  Database['public']['Views']['care_timeline']['Row'];

export class InvalidCareEventError extends Error {
  constructor() {
    super('invalid_care_event');
    this.name = 'InvalidCareEventError';
  }
}

export function mapBabyNote(
  row: BabyNoteRow,
  displayNames: ReadonlyMap<string, string>,
): NoteEvent {
  return {
    babyId: row.baby_id,
    content: row.content,
    icon: NotebookPen,
    id: row.id,
    occurredAt: row.occurred_at,
    recordedById: row.recorded_by,
    recordedByName: displayNames.get(row.recorded_by),
    sourceType: 'baby_note',
    type: 'note',
  };
}

export function mapMeasurement(
  row: MeasurementRow,
  displayNames: ReadonlyMap<string, string>,
): MeasurementEvent {
  return {
    babyId: row.baby_id,
    headCircumferenceMillimeters:
      row.head_circumference_millimeters ?? undefined,
    icon: Scale,
    id: row.id,
    lengthMillimeters: row.length_millimeters ?? undefined,
    notes: optionalText(row.notes),
    occurredAt: row.measured_at,
    recordedById: row.recorded_by,
    recordedByName: displayNames.get(row.recorded_by),
    source: row.source ?? 'other',
    sourceType: 'measurement',
    type: 'measurement',
    weightGrams: row.weight_grams ?? undefined,
  };
}

function optionalText(value: string | null): string | undefined {
  return value?.trim() || undefined;
}

function baseEvent(
  row: CareEventRow,
  displayNames: ReadonlyMap<string, string>,
) {
  return {
    babyId: row.baby_id,
    id: row.id,
    notes: optionalText(row.notes),
    occurredAt: row.occurred_at,
    recordedById: row.recorded_by,
    recordedByName: displayNames.get(row.recorded_by),
    sourceType: 'care_event' as const,
  };
}

export function mapCareEvent(
  row: CareEventRow,
  displayNames: ReadonlyMap<string, string>,
): CareEvent {
  const base = baseEvent(row, displayNames);

  if (row.event_type === 'feeding') {
    if (!row.feeding_method) {
      throw new InvalidCareEventError();
    }

    return {
      ...base,
      amountMilliliters: row.amount_milliliters ?? undefined,
      breastSide: row.breast_side ?? undefined,
      icon: Milk,
      method: row.feeding_method,
      type: 'feeding',
    };
  }

  if (row.event_type === 'diaper') {
    if (!row.diaper_condition) {
      throw new InvalidCareEventError();
    }

    return {
      ...base,
      condition: row.diaper_condition,
      icon: BabyIcon,
      type: 'diaper',
    };
  }

  return {
    ...base,
    endedAt: row.ended_at ?? undefined,
    icon: Moon,
    type: 'sleep',
  } satisfies SleepEvent;
}

export function mapCareTimelineRow(
  row: CareTimelineRow,
  displayNames: ReadonlyMap<string, string>,
): CareEvent {
  if (row.source_type === 'care_event') {
    return mapCareEvent(
      {
        amount_milliliters: row.amount_milliliters,
        baby_id: row.baby_id,
        breast_side: row.breast_side as CareEventRow['breast_side'],
        created_at: row.occurred_at,
        deleted_at: row.deleted_at,
        deleted_by: row.deleted_by,
        diaper_condition:
          row.diaper_condition as CareEventRow['diaper_condition'],
        ended_at: row.ended_at,
        event_type: row.event_type as CareEventRow['event_type'],
        feeding_method: row.feeding_method as CareEventRow['feeding_method'],
        id: row.id,
        notes: row.notes,
        occurred_at: row.occurred_at,
        recorded_by: row.recorded_by,
        updated_at: row.updated_at,
        updated_by: row.updated_by,
      },
      displayNames,
    );
  }

  if (row.source_type === 'baby_note') {
    if (!row.content) {
      throw new InvalidCareEventError();
    }

    return mapBabyNote(
      {
        baby_id: row.baby_id,
        content: row.content,
        created_at: row.occurred_at,
        deleted_at: row.deleted_at,
        deleted_by: row.deleted_by,
        id: row.id,
        occurred_at: row.occurred_at,
        recorded_by: row.recorded_by,
        updated_at: row.updated_at,
        updated_by: row.updated_by,
      },
      displayNames,
    );
  }

  return mapMeasurement(
    {
      baby_id: row.baby_id,
      created_at: row.occurred_at,
      deleted_at: row.deleted_at,
      deleted_by: row.deleted_by,
      head_circumference_millimeters: row.head_circumference_millimeters,
      id: row.id,
      length_millimeters: row.length_millimeters,
      measured_at: row.occurred_at,
      notes: row.notes,
      recorded_by: row.recorded_by,
      source: row.measurement_source,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
      weight_grams: row.weight_grams,
    },
    displayNames,
  );
}
