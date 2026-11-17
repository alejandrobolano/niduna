export type TextSuggestionKind = 'care_note' | 'expense_concept';

export interface TextSuggestion {
  lastUsedAt: string;
  occurrenceCount: number;
  value: string;
}

export interface TextSuggestionQuery {
  babyId: string;
  kind: TextSuggestionKind;
  limit: number;
  query: string;
}

export interface TextSuggestionRepository {
  load(query: TextSuggestionQuery): Promise<TextSuggestion[]>;
}

export function normalizeSuggestionValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

export function deduplicateSuggestions(
  suggestions: TextSuggestion[],
): TextSuggestion[] {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const normalized = normalizeSuggestionValue(suggestion.value);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}
