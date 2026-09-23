import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import {
  colors,
  createThemedStyleSheet,
  radius,
  spacing,
} from '@/shared/presentation/theme';

interface RecentValueChipsProps {
  formatValue?: (value: number) => string;
  onSelect: (value: number) => void;
  selectedValue?: number;
  unit: string;
  values: number[];
}

export function RecentValueChips({
  formatValue = (value) => String(value),
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
              accessibilityLabel={`Usar ${formatValue(value)} ${unit}`}
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
              {selected ? <Check color={colors.onAccent} size={15} strokeWidth={3} /> : null}
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {formatValue(value)} {unit}
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
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderColor: `${colors.aqua}66`,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.primaryPressed,
    fontSize: 14,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: colors.onAccent,
  },
}));
