import { Pressable, Text, View } from 'react-native';

import type { FeedingVolumeUnit } from '../domain/feeding-volume';
import { useFeedingVolumePreference } from './feeding-volume-preference-provider';
import { createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const options: { label: string; value: FeedingVolumeUnit }[] = [
  { label: 'Mililitros (ml)', value: 'ml' },
  { label: 'Onzas EE. UU. (oz)', value: 'us_oz' },
];

export function FeedingVolumePreferenceControl() {
  const { isSaving, setUnit, unit } = useFeedingVolumePreference();

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <Text style={styles.title}>Cantidad de alimentación</Text>
        <Text style={styles.description}>
          Elige cómo quieres introducir y consultar las cantidades. Los datos se conservan en mililitros.
        </Text>
      </View>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => {
          const selected = option.value === unit;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: isSaving }}
              disabled={isSaving}
              key={option.value}
              onPress={() => void setUnit(option.value).catch(() => undefined)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
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
  container: { gap: spacing.md },
  copy: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  description: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  options: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: spacing.xs,
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  optionSelected: { backgroundColor: colors.aqua },
  optionText: { color: colors.textMuted, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  optionTextSelected: { color: colors.text },
  pressed: { opacity: 0.75 },
}));
