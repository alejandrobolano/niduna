import type { ReactNode } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';
import { useKeyboardAwareInput } from '@/shared/presentation/keyboard-aware-scroll-view';

interface ProfileFieldProps extends TextInputProps {
  disabled?: boolean;
  error?: string;
  label: string;
  hint?: string;
  trailing?: ReactNode;
}

export function ProfileField({
  disabled = false,
  error,
  label,
  hint,
  onFocus,
  trailing,
  style,
  ...inputProps
}: ProfileFieldProps) {
  const revealInput = useKeyboardAwareInput();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error && styles.inputRowError, disabled && styles.inputRowDisabled]}>
        <TextInput
          accessibilityLabel={label}
          editable={!disabled}
          onFocus={(event) => {
            onFocus?.(event);
            revealInput(event.target);
          }}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style, disabled && styles.inputDisabled]}
          {...inputProps}
        />
        {trailing}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 148,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  inputRowDisabled: {
    opacity: 0.65,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.md,
  },
  inputDisabled: {
    color: colors.textMuted,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 17,
  },
}));
