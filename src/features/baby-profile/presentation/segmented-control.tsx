import { Pressable, Text, View } from 'react-native';

import { createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface Segment<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  disabled?: boolean;
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  disabled = false,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && styles.optionSelected, disabled && styles.optionDisabled]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  optionSelected: {
    backgroundColor: colors.surface,
  },
  optionDisabled: {
    opacity: 0.65,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.primary,
  },
}));
