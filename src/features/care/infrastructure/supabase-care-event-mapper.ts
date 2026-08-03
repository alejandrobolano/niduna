import type {
  CareEvent,
  SleepEvent,
} from '@/features/care/domain/care-event';
import type { Database } from '@/shared/infrastructure/supabase/database.types';
import { BabyIcon, Milk, Moon } from 'lucide-react-native';

type CareEventRow = Database['public']['Tables']['care_events']['Row'];

export class InvalidCareEventError extends Error {
  constructor() {
    super('invalid_care_event');
    this.name = 'InvalidCareEventError';
  }
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
