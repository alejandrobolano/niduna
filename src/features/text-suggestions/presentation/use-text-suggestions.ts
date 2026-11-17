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
  requestKey: string | null;
  suggestions: TextSuggestion[];
  status: SuggestionStatus;
}

const queryDelayMilliseconds = 180;
const minimumQueryLength = 2;

export function useTextSuggestions({
  babyId,
  enabled,
  kind,
  limit = 6,
  query,
  repository,
}: UseTextSuggestionsInput): TextSuggestionState {
  const normalizedQuery = query.trim();
  const canSearch = enabled && normalizedQuery.length >= minimumQueryLength;
  const requestKey = JSON.stringify([babyId, kind, limit, normalizedQuery]);
  const [state, setState] = useState<TextSuggestionState>({
    requestKey: null,
    status: 'idle',
    suggestions: [],
  });

  useEffect(() => {
    if (!canSearch) {
      return;
    }

    let active = true;
    const timeoutId = setTimeout(() => {
      void Promise.resolve()
        .then(() =>
          repository.load({
            babyId,
            kind,
            limit,
            query: normalizedQuery,
          }),
        )
        .then((suggestions) => {
          if (active) {
            setState({ requestKey, status: 'ready', suggestions });
          }
        })
        .catch(() => {
          if (active) {
            setState({ requestKey, status: 'error', suggestions: [] });
          }
        });
    }, queryDelayMilliseconds);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [
    babyId,
    canSearch,
    kind,
    limit,
    normalizedQuery,
    repository,
    requestKey,
  ]);

  if (!canSearch) {
    return { requestKey: null, status: 'idle', suggestions: [] };
  }

  if (state.requestKey !== requestKey) {
    return { requestKey, status: 'loading', suggestions: [] };
  }

  return state;
}
