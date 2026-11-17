import {
  deduplicateSuggestions,
  type TextSuggestionRepository,
} from '@/features/text-suggestions/application/text-suggestion-repository';
import { supabase } from '@/shared/infrastructure/supabase/client';

export const supabaseTextSuggestionRepository: TextSuggestionRepository = {
  async load({ babyId, kind, limit, query }) {
    const { data, error } = await supabase.rpc('list_baby_text_suggestions', {
      max_results: limit,
      target_baby_id: babyId,
      target_kind: kind,
      target_query: query,
    });

    if (error) {
      throw error;
    }

    return deduplicateSuggestions(
      (data ?? []).map((row) => ({
        lastUsedAt: row.last_used_at,
        occurrenceCount: row.occurrence_count,
        value: row.value,
      })),
    ).slice(0, limit);
  },
};
