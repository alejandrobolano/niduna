import { Pressable, Text, View } from 'react-native';

import { createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface RecentValueChipsProps {
  onSelect: (value: number) => void;
  selectedValue?: number;
  unit: string;
  values: number[];
}

export function RecentValueChips({
  onSelect,
  selectedValue,
  unit,
  values,
}: RecentValueChipsProps) {
  if (values.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Cantidades recientes</Text>
      <View style={styles.chips}>
        {values.map((value) => {
          const selected = selectedValue === value;

          return (
            <Pressable
              accessibilityLabel={`Usar ${value} ${unit}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={value}
              onPress={() => onSelect(value)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {value} {unit}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipPressed: {
    opacity: 0.72,
  },
  chipSelected: {
    backgroundColor: colors.aquaSoft,
    borderColor: colors.aqua,
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: colors.primaryPressed,
  },
}));
