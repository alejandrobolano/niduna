import { describe, expect, it } from 'vitest';

import {
  InvalidCareEventError,
  mapCareEvent,
} from '../src/features/care/infrastructure/supabase-care-event-mapper';
import type { Database } from '../src/shared/infrastructure/supabase/database.types';

type CareEventRow = Database['public']['Tables']['care_events']['Row'];

const baseRow: CareEventRow = {
  amount_milliliters: null,
  baby_id: 'baby-1',
  breast_side: null,
  created_at: '2026-07-29T10:00:00.000Z',
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
      id: 'event-1',
      method: 'breast',
      notes: 'Comió tranquila',
      occurredAt: '2026-07-29T10:00:00.000Z',
      recordedByName: 'Alejandro',
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
