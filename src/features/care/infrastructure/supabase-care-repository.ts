import {
  CareOperationError,
  type CareOperationErrorReason,
  type CareRepository,
} from '@/features/care/application/care-repository';
import { mapCareEvent } from '@/features/care/infrastructure/supabase-care-event-mapper';
import { supabase } from '@/shared/infrastructure/supabase/client';
import type { Database } from '@/shared/infrastructure/supabase/database.types';

type CareEventInsert =
  Database['public']['Tables']['care_events']['Insert'];

function mapErrorReason(
  code: string | undefined,
  message: string,
): CareOperationErrorReason {
  if (code === '23505' || message.includes('one_open_sleep')) {
    return 'sleep_already_running';
  }

  if (
    code === '42501' ||
    message.includes('row-level security') ||
    message.includes('permission denied')
  ) {
    return 'not_allowed';
  }

  return 'unknown';
}

function throwOperationError(
  code: string | undefined,
  message: string,
): never {
  throw new CareOperationError(mapErrorReason(code, message));
}

function normalizeNotes(notes: string | undefined): string | null {
  return notes?.trim() || null;
}

async function insertEvent(
  event: CareEventInsert,
): Promise<void> {
  const { error } = await supabase.from('care_events').insert(event);

  if (error) {
    throwOperationError(error.code, error.message);
  }
}

export const supabaseCareRepository: CareRepository = {
  async load(userId) {
    const { data: baby, error: babyError } = await supabase
      .from('babies')
      .select('id, family_id, life_stage, name')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (babyError) {
      throwOperationError(babyError.code, babyError.message);
    }

    if (!baby) {
      return null;
    }

    const [membershipResult, eventsResult] = await Promise.all([
      supabase
        .from('family_members')
        .select('role')
        .eq('family_id', baby.family_id)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('care_events')
        .select(
          'id, baby_id, event_type, occurred_at, ended_at, feeding_method, amount_milliliters, breast_side, diaper_condition, notes, recorded_by, updated_by, created_at, updated_at',
        )
        .eq('baby_id', baby.id)
        .order('occurred_at', { ascending: false })
        .limit(1001),
    ]);
    const loadError = membershipResult.error ?? eventsResult.error;

    if (loadError) {
      throwOperationError(loadError.code, loadError.message);
    }

    const loadedRows = eventsResult.data ?? [];
    const rows = loadedRows.slice(0, 1000);
    const userIds = [...new Set(rows.map((row) => row.recorded_by))];
    const displayNames = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);

      if (profilesError) {
        throwOperationError(profilesError.code, profilesError.message);
      }

      for (const profile of profiles ?? []) {
        if (profile.display_name) {
          displayNames.set(profile.id, profile.display_name);
        }
      }
    }

    return {
      baby: {
        id: baby.id,
        lifeStage: baby.life_stage,
        name: baby.name,
      },
      canRecord:
        membershipResult.data?.role === 'owner' ||
        membershipResult.data?.role === 'admin' ||
        membershipResult.data?.role === 'caregiver',
      events: rows.map((row) => mapCareEvent(row, displayNames)),
      hasOlderEvents: loadedRows.length > rows.length,
    };
  },

  async recordFeeding(input) {
    await insertEvent({
      amount_milliliters: input.amountMilliliters ?? null,
      baby_id: input.babyId,
      breast_side: input.breastSide ?? null,
      event_type: 'feeding',
      feeding_method: input.method,
      notes: normalizeNotes(input.notes),
      occurred_at: new Date().toISOString(),
    });
  },

  async recordDiaper(input) {
    await insertEvent({
      baby_id: input.babyId,
      diaper_condition: input.condition,
      event_type: 'diaper',
      notes: normalizeNotes(input.notes),
      occurred_at: new Date().toISOString(),
    });
  },

  async startSleep(input) {
    await insertEvent({
      baby_id: input.babyId,
      event_type: 'sleep',
      notes: normalizeNotes(input.notes),
      occurred_at: new Date().toISOString(),
    });
  },

  async finishSleep(eventId) {
    const { data, error } = await supabase
      .from('care_events')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', eventId)
      .eq('event_type', 'sleep')
      .is('ended_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throwOperationError(error.code, error.message);
    }

    if (!data) {
      throw new CareOperationError('unknown');
    }
  },

  subscribe(babyId, onChange) {
    const channel = supabase
      .channel(`care-events:${babyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `baby_id=eq.${babyId}`,
          schema: 'public',
          table: 'care_events',
        },
        onChange,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
