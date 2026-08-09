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
    recordedByName: displayNames.get(row.recorded_by),
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
    recordedByName: displayNames.get(row.recorded_by),
    source: row.source ?? 'other',
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
    recordedByName: displayNames.get(row.recorded_by),
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
