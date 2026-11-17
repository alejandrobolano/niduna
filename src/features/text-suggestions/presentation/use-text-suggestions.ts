import { useEffect, useState } from 'react';

import type {
  TextSuggestion,
  TextSuggestionKind,
  TextSuggestionRepository,
} from '@/features/text-suggestions/application/text-suggestion-repository';

type SuggestionStatus = 'error' | 'idle' | 'loading' | 'ready';

interface UseTextSuggestionsInput {
  babyId: string;
  enabled: boolean;
  kind: TextSuggestionKind;
  limit?: number;
  query: string;
  repository: TextSuggestionRepository;
}

interface TextSuggestionState {
  suggestions: TextSuggestion[];
  status: SuggestionStatus;
}

const queryDelayMilliseconds = 180;

export function useTextSuggestions({
  babyId,
  enabled,
  kind,
  limit = 6,
  query,
  repository,
}: UseTextSuggestionsInput): TextSuggestionState {
  const [state, setState] = useState<TextSuggestionState>({
    status: 'idle',
    suggestions: [],
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    setState((current) => ({ ...current, status: 'loading' }));

    const timeoutId = setTimeout(() => {
      void repository
        .load({ babyId, kind, limit, query })
        .then((suggestions) => {
          if (active) {
            setState({ status: 'ready', suggestions });
          }
        })
        .catch(() => {
          if (active) {
            setState({ status: 'error', suggestions: [] });
          }
        });
    }, queryDelayMilliseconds);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [babyId, enabled, kind, limit, query, repository]);

  return state;
}
