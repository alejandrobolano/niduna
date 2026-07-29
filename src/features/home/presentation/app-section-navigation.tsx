import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/presentation/theme';

export type AppSection = 'baby' | 'family';

interface AppSectionNavigationProps {
  onChange: (section: AppSection) => void;
  value: AppSection;
}

const sections = [
  { glyph: '♡', label: 'Bebé', value: 'baby' },
  { glyph: '⌂', label: 'Familia', value: 'family' },
] satisfies { glyph: string; label: string; value: AppSection }[];

export function AppSectionNavigation({
  onChange,
  value,
}: AppSectionNavigationProps) {
  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {sections.map((section) => {
        const selected = value === section.value;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={section.value}
            onPress={() => onChange(section.value)}
            style={({ pressed }) => [
              styles.item,
              selected && styles.itemSelected,
              pressed && styles.itemPressed,
            ]}
          >
            <Text style={[styles.glyph, selected && styles.glyphSelected]}>
              {section.glyph}
            </Text>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {section.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  item: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
  },
  itemSelected: {
    backgroundColor: colors.surface,
  },
  itemPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  glyph: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '900',
  },
  glyphSelected: {
    color: colors.coral,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  labelSelected: {
    color: colors.text,
  },
});
