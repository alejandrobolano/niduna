import { BabyIcon, ClipboardList, Heart, History, House, Moon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/presentation/theme';

export type AppSection = 'handoff' | 'history' | 'baby' | 'family' | 'activity';

interface AppSectionNavigationProps {
  canViewActivity: boolean;
  onChange: (section: AppSection) => void;
  value: AppSection;
}

const sections = [
  { icon: Moon, label: 'Relevo', value: 'handoff' },
  { icon: ClipboardList, label: 'Registro', value: 'history' },
  { icon: Heart, label: 'Bebé', value: 'baby' },
  { icon: House, label: 'Familia', value: 'family' },
  { icon: History, label: 'Actividad', value: 'activity', managersOnly: true },
] satisfies {
  icon: typeof BabyIcon | typeof Heart | typeof House;
  label: string;
  managersOnly?: boolean;
  value: AppSection;
}[];

export function AppSectionNavigation({
  canViewActivity,
  onChange,
  value,
}: AppSectionNavigationProps) {
  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {sections.filter((section) => !section.managersOnly || canViewActivity).map((section) => {
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
            <section.icon
              color={selected ? colors.coral : colors.textMuted}
              size={18}
            />
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
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  item: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexGrow: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 104,
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
