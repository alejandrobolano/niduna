import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  type TextInputKeyPressEvent,
  View,
} from 'react-native';

import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import type {
  TextSuggestion,
  TextSuggestionKind,
  TextSuggestionRepository,
} from '@/features/text-suggestions/application/text-suggestion-repository';
import { useTextSuggestions } from '@/features/text-suggestions/presentation/use-text-suggestions';
import { createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface AutocompleteTextFieldProps {
  babyId: string;
  error?: string;
  kind: TextSuggestionKind;
  label: string;
  maxLength: number;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  repository: TextSuggestionRepository;
  value: string;
}

function suggestionUsageLabel(suggestion: TextSuggestion): string {
  return suggestion.occurrenceCount === 1
    ? 'Usado una vez'
    : `Usado ${suggestion.occurrenceCount} veces`;
}

export function AutocompleteTextField({
  babyId,
  error,
  kind,
  label,
  maxLength,
  multiline = false,
  onChangeText,
  placeholder,
  repository,
  value,
}: AutocompleteTextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const expanded = focused && !dismissed;
  const { status, suggestions } = useTextSuggestions({
    babyId,
    enabled: expanded,
    kind,
    query: value,
    repository,
  });

  useEffect(
    () => () => {
      if (blurTimeout.current) {
        clearTimeout(blurTimeout.current);
      }
    },
    [],
  );

  function selectSuggestion(suggestion: TextSuggestion) {
    onChangeText(suggestion.value);
    setDismissed(true);
    setActiveIndex(0);
  }

  function handleKeyPress(
    event: TextInputKeyPressEvent,
  ) {
    if (!expanded || !suggestions.length) {
      return;
    }

    if (event.nativeEvent.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.nativeEvent.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(
        (current) => (current - 1 + suggestions.length) % suggestions.length,
      );
      return;
    }

    if (event.nativeEvent.key === 'Enter' && !multiline) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex] ?? suggestions[0]);
      return;
    }

    if (event.nativeEvent.key === 'Escape') {
      setDismissed(true);
    }
  }

  function handleChange(nextValue: string) {
    onChangeText(nextValue);
    setDismissed(false);
    setActiveIndex(0);
  }

  return (
    <View style={styles.container}>
      <ProfileField
        accessibilityState={{ expanded }}
        error={error}
        label={label}
        maxLength={maxLength}
        multiline={multiline}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setFocused(false), 120);
        }}
        onChangeText={handleChange}
        onFocus={() => {
          if (blurTimeout.current) {
            clearTimeout(blurTimeout.current);
          }
          setFocused(true);
          setDismissed(false);
        }}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        value={value}
      />

      {expanded &&
      (status === 'loading' || status === 'error' || suggestions.length > 0) ? (
        <View accessibilityLiveRegion="polite" style={styles.suggestions}>
          {status === 'loading' ? (
            <Text style={styles.status}>Buscando sugerencias…</Text>
          ) : status === 'error' ? (
            <Text accessibilityRole="alert" style={styles.error}>
              No pudimos cargar las sugerencias. Puedes seguir escribiendo.
            </Text>
          ) : status === 'ready' ? (
            <View accessibilityLabel={`Sugerencias para ${label}`}>
              {suggestions.map((suggestion, index) => (
                <Pressable
                  accessibilityHint="Completa el campo con este texto"
                  accessibilityLabel={`${suggestion.value}. ${suggestionUsageLabel(suggestion)}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeIndex === index }}
                  key={`${suggestion.value}-${suggestion.lastUsedAt}`}
                  onPress={() => selectSuggestion(suggestion)}
                  style={({ pressed }) => [
                    styles.suggestion,
                    activeIndex === index && styles.suggestionActive,
                    pressed && styles.suggestionPressed,
                  ]}
                >
                  <Text numberOfLines={2} style={styles.suggestionValue}>
                    {suggestion.value}
                  </Text>
                  <Text style={styles.suggestionMeta}>
                    {suggestionUsageLabel(suggestion)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: { flex: 1, minWidth: 0 },
  suggestions: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  status: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    padding: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 17,
    padding: spacing.md,
  },
  suggestion: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionActive: { backgroundColor: colors.aquaSoft },
  suggestionPressed: { opacity: 0.72 },
  suggestionValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  suggestionMeta: { color: colors.textMuted, fontSize: 11 },
}));
