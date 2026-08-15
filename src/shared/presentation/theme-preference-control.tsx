import { Laptop, Moon, Sun } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useThemePreference } from '@/shared/presentation/theme-preference-provider';
import type { ThemePreference } from '@/shared/presentation/theme-preference-storage';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const options: {
  icon: typeof Laptop;
  label: string;
  value: ThemePreference;
}[] = [
  { icon: Laptop, label: 'Sistema', value: 'system' },
  { icon: Sun, label: 'Claro', value: 'light' },
  { icon: Moon, label: 'Oscuro', value: 'dark' },
];

export function ThemePreferenceControl() {
  const { preference, setPreference } = useThemePreference();

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>Apariencia</Text>
        <Text style={styles.caption}>Solo cambia en este dispositivo</Text>
      </View>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => {
          const Icon = option.icon;
          const selected = preference === option.value;

          return (
            <Pressable
              accessibilityLabel={`Usar tema ${option.label.toLowerCase()}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.value}
              onPress={() => setPreference(option.value)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <Icon color={selected ? colors.onAccent : colors.textMuted} size={18} />
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  section: { gap: spacing.md },
  heading: { gap: 2 },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  caption: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  options: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 0,
  },
  optionSelected: { backgroundColor: colors.primary },
  optionPressed: { opacity: 0.72 },
  optionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  optionLabelSelected: { color: colors.onAccent },
}));
