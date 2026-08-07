import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/presentation/theme';

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
  trailing,
  style,
  ...inputProps
}: ProfileFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error && styles.inputRowError, disabled && styles.inputRowDisabled]}>
        <TextInput
          accessibilityLabel={label}
          editable={!disabled}
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

const styles = StyleSheet.create({
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
});
