import {
  ContractionError,
  type ContractionRepository,
} from '@/features/contractions/application/contraction-repository';
import type { Contraction } from '@/features/contractions/domain/contraction';
import { createRealtimeChannelTopic } from '@/shared/infrastructure/supabase/realtime-channel-topic';
import { supabase } from '@/shared/infrastructure/supabase/client';

function mapError(error?: { code?: string; message?: string } | null): ContractionError {
  if (error?.code === '23505' || error?.message?.includes('already_active')) {
    return new ContractionError('already_active');
  }
  if (error?.code === '42501' || error?.message?.includes('not_allowed')) {
    return new ContractionError('not_allowed');
  }
  return new ContractionError('unavailable');
}

function mapRow(row: {
  baby_id: string;
  ended_at: string | null;
  id: string;
  recorded_by: string;
  started_at: string;
}): Contraction {
  return {
    babyId: row.baby_id,
    endedAt: row.ended_at ?? undefined,
    id: row.id,
    recordedBy: row.recorded_by,
    startedAt: row.started_at,
  };
}

export const supabaseContractionRepository: ContractionRepository = {
  async finish(contractionId) {
    const { error } = await supabase.rpc('finish_baby_contraction', {
      target_contraction_id: contractionId,
    });
    if (error) throw mapError(error);
  },

  async loadRecent(babyId) {
    const { data, error } = await supabase
      .from('baby_contractions')
      .select('id, baby_id, recorded_by, started_at, ended_at')
      .eq('baby_id', babyId)
      .order('started_at', { ascending: false })
      .limit(20);
    if (error) throw mapError(error);
    return (data ?? []).map(mapRow);
  },

  async remove(contractionId) {
    const { error } = await supabase.rpc('delete_baby_contraction', {
      target_contraction_id: contractionId,
    });
    if (error) throw mapError(error);
  },

  async start(babyId) {
    const { data, error } = await supabase.rpc('start_baby_contraction', {
      target_baby_id: babyId,
    });
    if (error || !data) throw mapError(error);
    return data;
  },

  subscribe(babyId, onChange) {
    const channel = supabase
      .channel(createRealtimeChannelTopic('baby-contractions', babyId))
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `baby_id=eq.${babyId}`,
          schema: 'public',
          table: 'baby_contractions',
        },
        onChange,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
