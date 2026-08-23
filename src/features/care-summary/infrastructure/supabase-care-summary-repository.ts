import type { CareSummaryRepository } from '@/features/care-summary/application/care-summary-repository';
import type {
  CareTrendPoint,
  DailyCareSummary,
  MeasurementTrendPoint,
} from '@/features/care-summary/domain/daily-care-summary';
import { supabase } from '@/shared/infrastructure/supabase/client';
import type { Database } from '@/shared/infrastructure/supabase/database.types';
import { createRealtimeChannelTopic } from '@/shared/infrastructure/supabase/realtime-channel-topic';

type CareRangeSummaryRow =
  Database['public']['Functions']['get_care_range_summary']['Returns'][number];
type CareTrendRow =
  Database['public']['Functions']['get_care_summary_trend']['Returns'][number];
type MeasurementTrendRow =
  Database['public']['Functions']['get_measurement_evolution']['Returns'][number];

function optionalNumber(value: number | null): number | undefined {
  return value ?? undefined;
}

function mapSummary(row: CareRangeSummaryRow): DailyCareSummary {
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

function mapTrend(row: CareTrendRow): CareTrendPoint {
  return {
    diaperCount: row.diaper_count,
    feedingAmountMilliliters: row.feeding_amount_milliliters,
    feedingCount: row.feeding_count,
    noteCount: row.note_count,
    sleepMinutes: row.sleep_minutes,
    startedAt: row.bucket_start,
  };
}

function mapMeasurement(row: MeasurementTrendRow): MeasurementTrendPoint {
  return {
    headCircumferenceMillimeters: optionalNumber(
      row.head_circumference_millimeters,
    ),
    lengthMillimeters: optionalNumber(row.length_millimeters),
    measuredAt: row.measured_at,
    source: row.measurement_source ?? undefined,
    weightGrams: optionalNumber(row.weight_grams),
  };
}

export const supabaseCareSummaryRepository: CareSummaryRepository = {
  async loadReport(query) {
    const summaryRequest = supabase.rpc('get_care_range_summary', {
      target_baby_id: query.babyId,
      target_range_end: query.endAt,
      target_range_start: query.startAt,
    });
    const trendRequest = supabase.rpc('get_care_summary_trend', {
      target_baby_id: query.babyId,
      target_bucket_minutes: query.bucketMinutes,
      target_range_end: query.endAt,
      target_range_start: query.startAt,
    });
    const measurementRequest = supabase.rpc('get_measurement_evolution', {
      target_baby_id: query.babyId,
    });
    const [summaryResult, trendResult, measurementResult] = await Promise.all([
      summaryRequest,
      trendRequest,
      measurementRequest,
    ]);

    if (summaryResult.error || !summaryResult.data?.[0]) {
      throw new Error(summaryResult.error?.message ?? 'care_summary_not_found');
    }
    if (trendResult.error) {
      throw new Error(trendResult.error.message);
    }
    if (measurementResult.error) {
      throw new Error(measurementResult.error.message);
    }

    return {
      measurements: (measurementResult.data ?? []).map(mapMeasurement),
      summary: mapSummary(summaryResult.data[0]),
      trend: (trendResult.data ?? []).map(mapTrend),
    };
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
