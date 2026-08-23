import {
    CareOperationError,
    type CareOperationErrorReason,
    type CareHistoryPage,
    type CareHistoryQuery,
    type CareRepository,
} from '@/features/care/application/care-repository';
import {
    mapBabyNote,
    mapCareEvent,
    mapCareTimelineRow,
    mapMeasurement,
    type CareTimelineRow,
} from '@/features/care/infrastructure/supabase-care-event-mapper';
import type { CareEvent } from '@/features/care/domain/care-event';
import { supabase } from '@/shared/infrastructure/supabase/client';
import type { Database } from '@/shared/infrastructure/supabase/database.types';
import { createRealtimeChannelTopic } from '@/shared/infrastructure/supabase/realtime-channel-topic';

type CareEventInsert =
  Database['public']['Tables']['care_events']['Insert'];
type NotifiableActivityType = 'measurement' | 'note';

function mapErrorReason(
  code: string | undefined,
  message: string,
): CareOperationErrorReason {
  if (message.includes('care_record_recovery_expired')) {
    return 'recovery_expired';
  }

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

  void dispatchCareNotifications(data.id);
}

async function dispatchCareNotifications(eventId: string): Promise<void> {
  await Promise.allSettled([
    supabase.functions.invoke('dispatch-care-notification', {
      body: { eventId },
    }),
    supabase.functions.invoke('dispatch-web-care-notification', {
      body: { eventId },
    }),
  ]);
}

async function dispatchActivityNotifications(
  activityId: string,
  activityType: NotifiableActivityType,
): Promise<void> {
  await Promise.allSettled([
    supabase.functions.invoke('dispatch-activity-notification', {
      body: { activityId, activityType },
    }),
  ]);
}

async function loadDisplayNames(
  userIds: string[],
): Promise<ReadonlyMap<string, string>> {
  const displayNames = new Map<string, string>();

  if (userIds.length === 0) {
    return displayNames;
  }

  for (const userId of new Set(userIds)) {
    displayNames.set(userId, 'Usuario eliminado');
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', [...new Set(userIds)]);

  if (error) {
    throwOperationError(error.code, error.message);
  }

  for (const profile of profiles ?? []) {
    displayNames.set(profile.id, profile.display_name || 'Un familiar');
  }

  return displayNames;
}

function getDateRange(date: string): { from: string; to: string } {
  const [year, month, day] = date.split('-').map(Number);
  const from = new Date(year, month - 1, day);
  const to = new Date(year, month - 1, day + 1);

  return { from: from.toISOString(), to: to.toISOString() };
}

async function loadHistoryPage(
  query: CareHistoryQuery,
  retired = false,
): Promise<CareHistoryPage> {
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  let request = supabase
    .from(retired ? 'retired_care_timeline' : 'care_timeline')
    .select('*', { count: 'exact' })
    .eq('baby_id', query.babyId)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false });

  if (query.filter !== 'all') {
    request = request.eq('event_type', query.filter);
  }

  if (query.date) {
    const range = getDateRange(query.date);
    request = request.gte('occurred_at', range.from).lt('occurred_at', range.to);
  }

  const { count, data, error } = await request.range(from, to);

  if (error) {
    throwOperationError(error.code, error.message);
  }

  const rows = (data ?? []) as CareTimelineRow[];
  const displayNames = await loadDisplayNames(
    rows.map((row) => row.recorded_by),
  );
  const total = count ?? 0;

  return {
    events: rows.map((row) => mapCareTimelineRow(row, displayNames)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export const supabaseCareRepository: CareRepository = {
  loadHistory: loadHistoryPage,

  async loadRetiredHistory(query) {
    return loadHistoryPage(query, true);
  },

  async loadHistoryForExport(query) {
    const events: CareEvent[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const result = await loadHistoryPage({
        ...query,
        page,
        pageSize: 100,
      });
      events.push(...result.events);
      totalPages = result.totalPages;
      page += 1;
    } while (page <= totalPages);

    return events;
  },

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

    const dashboardLoadedAt = new Date().toISOString();
    const [
      membershipResult,
      eventsResult,
      notesResult,
      measurementsResult,
      birthWeightResult,
      latestWeightResult,
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
          'id, baby_id, event_type, occurred_at, ended_at, feeding_method, amount_milliliters, breast_side, diaper_condition, notes, recorded_by, updated_by, created_at, updated_at, deleted_at, deleted_by',
        )
        .eq('baby_id', baby.id)
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false })
        .limit(25),
      supabase
        .from('baby_notes')
        .select('*')
        .eq('baby_id', baby.id)
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false })
        .limit(25),
      supabase
        .from('baby_measurements')
        .select('*')
        .eq('baby_id', baby.id)
        .is('deleted_at', null)
        .order('measured_at', { ascending: false })
        .limit(25),
      supabase
        .from('baby_measurements')
        .select('id, measured_at, source, weight_grams')
        .eq('baby_id', baby.id)
        .eq('source', 'birth')
        .is('deleted_at', null)
        .not('weight_grams', 'is', null)
        .maybeSingle(),
      supabase
        .from('baby_measurements')
        .select('id, measured_at, source, weight_grams')
        .eq('baby_id', baby.id)
        .is('deleted_at', null)
        .not('weight_grams', 'is', null)
        .lte('measured_at', dashboardLoadedAt)
        .order('measured_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const loadError =
      membershipResult.error ??
      eventsResult.error ??
      notesResult.error ??
      measurementsResult.error ??
      birthWeightResult.error ??
      latestWeightResult.error;

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
    const selectedEvents = loadedEvents.slice(0, 20);
    const userIds = [
      ...new Set(selectedEvents.map((event) => event.recordedBy)),
    ];
    const displayNames = await loadDisplayNames(userIds);
    const weightMeasurements = new Map(
      [birthWeightResult.data, latestWeightResult.data].flatMap((row) =>
        row && row.weight_grams !== null
          ? [[row.id, {
              occurredAt: row.measured_at,
              source: row.source ?? 'other',
              weightGrams: row.weight_grams,
            }] as const]
          : [],
      ),
    );

    return {
      baby: {
        birthDate: baby.birth_date ?? undefined,
        id: baby.id,
        lifeStage: baby.life_stage,
        name: baby.name,
      },
      canManage:
        membershipResult.data?.role === 'owner' ||
        membershipResult.data?.role === 'admin',
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
      weightMeasurements: [...weightMeasurements.values()],
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
    const { data, error } = await supabase
      .from('baby_notes')
      .insert({
        baby_id: input.babyId,
        content: input.content.trim(),
        occurred_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throwOperationError(error.code, error.message);
    }

    void dispatchActivityNotifications(data.id, 'note');
  },

  async recordMeasurement(input) {
    const { data, error } = await supabase
      .from('baby_measurements')
      .insert({
        baby_id: input.babyId,
        head_circumference_millimeters:
          input.headCircumferenceMillimeters ?? null,
        length_millimeters: input.lengthMillimeters ?? null,
        measured_at: new Date().toISOString(),
        notes: normalizeNotes(input.notes),
        source: input.source,
        weight_grams: input.weightGrams ?? null,
      })
      .select('id')
      .single();

    if (error) {
      throwOperationError(error.code, error.message);
    }

    void dispatchActivityNotifications(data.id, 'measurement');
  },

  async restoreEvent(event) {
    const { error } = await supabase.rpc('restore_care_record', {
      target_baby_id: event.babyId,
      target_record_id: event.id,
      target_source_type: event.sourceType,
    });

    if (error) {
      throwOperationError(error.code, error.message);
    }
  },

  async retireEvents(events) {
    const babyId = events[0]?.babyId;
    if (!babyId || events.some((event) => event.babyId !== babyId)) {
      throw new CareOperationError('unknown');
    }

    const { data, error } = await supabase.rpc('retire_care_records', {
      target_baby_id: babyId,
      target_records: events.map((event) => ({
        id: event.id,
        sourceType: event.sourceType,
      })),
    });

    if (error) {
      throwOperationError(error.code, error.message);
    }

    if (data !== events.length) {
      throw new CareOperationError('unknown');
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
      .channel(createRealtimeChannelTopic('care-events', babyId))
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

  async updateEvent(event) {
    const payload =
      event.type === 'feeding'
        ? {
            amountMilliliters: event.amountMilliliters ?? null,
            breastSide: event.breastSide ?? null,
            method: event.method,
            notes: event.notes ?? null,
            occurredAt: event.occurredAt,
          }
        : event.type === 'diaper'
          ? {
              condition: event.condition,
              notes: event.notes ?? null,
              occurredAt: event.occurredAt,
            }
          : event.type === 'sleep'
            ? {
                endedAt: event.endedAt ?? null,
                notes: event.notes ?? null,
                occurredAt: event.occurredAt,
              }
            : event.type === 'note'
              ? { content: event.content, occurredAt: event.occurredAt }
              : {
                  headCircumferenceMillimeters:
                    event.headCircumferenceMillimeters ?? null,
                  lengthMillimeters: event.lengthMillimeters ?? null,
                  notes: event.notes ?? null,
                  occurredAt: event.occurredAt,
                  source: event.source,
                  weightGrams: event.weightGrams ?? null,
                };
    const { error } = await supabase.rpc('update_care_record', {
      target_baby_id: event.babyId,
      target_payload: payload,
      target_record_id: event.id,
      target_source_type: event.sourceType,
    });

    if (error) {
      throwOperationError(error.code, error.message);
    }
  },
};
