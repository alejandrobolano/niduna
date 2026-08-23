import type { CareSummaryRepository } from '@/features/care-summary/application/care-summary-repository';
import type { DailyCareSummary } from '@/features/care-summary/domain/daily-care-summary';
import { supabase } from '@/shared/infrastructure/supabase/client';
import type { Database } from '@/shared/infrastructure/supabase/database.types';
import { createRealtimeChannelTopic } from '@/shared/infrastructure/supabase/realtime-channel-topic';

type DailyCareSummaryRow =
  Database['public']['Functions']['get_daily_care_summary']['Returns'][number];

function optionalNumber(value: number | null): number | undefined {
  return value ?? undefined;
}

function mapSummary(row: DailyCareSummaryRow): DailyCareSummary {
  const diaperTotal =
    row.diaper_wet_count +
    row.diaper_dirty_count +
    row.diaper_both_count;
  const hasMeasurement = Boolean(row.latest_measurement_at);

  return {
    diaper: {
      both: row.diaper_both_count,
      dirty: row.diaper_dirty_count,
      total: diaperTotal,
      wet: row.diaper_wet_count,
    },
    feeding: {
      averageIntervalMinutes: optionalNumber(
        row.average_feeding_interval_minutes,
      ),
      count: row.feeding_count,
      knownAmountCount: row.feeding_amount_count,
      totalAmountMilliliters: row.feeding_amount_milliliters,
    },
    latestMeasurement: hasMeasurement
      ? {
          headCircumferenceMillimeters: optionalNumber(
            row.latest_head_circumference_millimeters,
          ),
          lengthMillimeters: optionalNumber(
            row.latest_length_millimeters,
          ),
          measuredAt: row.latest_measurement_at as string,
          source: row.latest_measurement_source ?? undefined,
          weightGrams: optionalNumber(row.latest_weight_grams),
        }
      : undefined,
    noteCount: row.note_count,
    sleepMinutes: row.sleep_minutes,
  };
}

export const supabaseCareSummaryRepository: CareSummaryRepository = {
  async loadDaily(query) {
    const { data, error } = await supabase.rpc('get_daily_care_summary', {
      target_baby_id: query.babyId,
      target_range_end: query.endAt,
      target_range_start: query.startAt,
    });

    if (error || !data?.[0]) {
      throw new Error(error?.message ?? 'daily_care_summary_not_found');
    }

    return mapSummary(data[0]);
  },

  subscribe(babyId, onChange) {
    const channel = supabase
      .channel(createRealtimeChannelTopic('care-summary', babyId))
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
