import {
    CareOperationError,
    type CareOperationErrorReason,
    type CareRepository,
} from '@/features/care/application/care-repository';
import {
    mapBabyNote,
    mapCareEvent,
    mapMeasurement,
} from '@/features/care/infrastructure/supabase-care-event-mapper';
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
  const { data, error } = await supabase
    .from('care_events')
    .insert(event)
    .select('id')
    .single();

  if (error) {
    throwOperationError(error.code, error.message);
  }

  void dispatchCareNotification(data.id);
}

async function dispatchCareNotification(eventId: string): Promise<void> {
  try {
    await supabase.functions.invoke('dispatch-care-notification', {
      body: { eventId },
    });
  } catch {
    return;
  }
}

export const supabaseCareRepository: CareRepository = {
  async load(userId, babyId) {
    const { data: baby, error: babyError } = await supabase
      .from('babies')
      .select('id, birth_date, family_id, life_stage, name')
      .eq('id', babyId)
      .maybeSingle();

    if (babyError) {
      throwOperationError(babyError.code, babyError.message);
    }

    if (!baby) {
      return null;
    }

    const [
      membershipResult,
      eventsResult,
      notesResult,
      measurementsResult,
    ] = await Promise.all([
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
      supabase
        .from('baby_notes')
        .select('*')
        .eq('baby_id', baby.id)
        .order('occurred_at', { ascending: false })
        .limit(1001),
      supabase
        .from('baby_measurements')
        .select('*')
        .eq('baby_id', baby.id)
        .order('measured_at', { ascending: false })
        .limit(1001),
    ]);
    const loadError =
      membershipResult.error ??
      eventsResult.error ??
      notesResult.error ??
      measurementsResult.error;

    if (loadError) {
      throwOperationError(loadError.code, loadError.message);
    }

    const loadedEvents = [
      ...(eventsResult.data ?? []).map((row) => ({
        kind: 'care' as const,
        occurredAt: row.occurred_at,
        recordedBy: row.recorded_by,
        row,
      })),
      ...(notesResult.data ?? []).map((row) => ({
        kind: 'note' as const,
        occurredAt: row.occurred_at,
        recordedBy: row.recorded_by,
        row,
      })),
      ...(measurementsResult.data ?? []).map((row) => ({
        kind: 'measurement' as const,
        occurredAt: row.measured_at,
        recordedBy: row.recorded_by,
        row,
      })),
    ].sort(
      (left, right) =>
        Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
    );
    const selectedEvents = loadedEvents.slice(0, 1000);
    const userIds = [
      ...new Set(selectedEvents.map((event) => event.recordedBy)),
    ];
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
        birthDate: baby.birth_date ?? undefined,
        id: baby.id,
        lifeStage: baby.life_stage,
        name: baby.name,
      },
      canRecord:
        membershipResult.data?.role === 'owner' ||
        membershipResult.data?.role === 'admin' ||
        membershipResult.data?.role === 'caregiver',
      events: selectedEvents.map((event) => {
        if (event.kind === 'care') {
          return mapCareEvent(event.row, displayNames);
        }

        if (event.kind === 'note') {
          return mapBabyNote(event.row, displayNames);
        }

        return mapMeasurement(event.row, displayNames);
      }),
      hasOlderEvents: loadedEvents.length > selectedEvents.length,
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

  async recordNote(input) {
    const { error } = await supabase.from('baby_notes').insert({
      baby_id: input.babyId,
      content: input.content.trim(),
      occurred_at: new Date().toISOString(),
    });

    if (error) {
      throwOperationError(error.code, error.message);
    }
  },

  async recordMeasurement(input) {
    const { error } = await supabase.from('baby_measurements').insert({
      baby_id: input.babyId,
      head_circumference_millimeters:
        input.headCircumferenceMillimeters ?? null,
      length_millimeters: input.lengthMillimeters ?? null,
      measured_at: new Date().toISOString(),
      notes: normalizeNotes(input.notes),
      source: input.source,
      weight_grams: input.weightGrams ?? null,
    });

    if (error) {
      throwOperationError(error.code, error.message);
    }
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
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `baby_id=eq.${babyId}`,
          schema: 'public',
          table: 'baby_notes',
        },
        onChange,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `baby_id=eq.${babyId}`,
          schema: 'public',
          table: 'baby_measurements',
        },
        onChange,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
