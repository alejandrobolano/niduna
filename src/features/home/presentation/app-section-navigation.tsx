import { BabyIcon, ClipboardList, Heart, House, Moon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { AppSection } from '@/features/home/domain/app-section';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface AppSectionNavigationProps {
  careHistoryAvailable?: boolean;
  onChange: (section: AppSection) => void;
  placement?: 'header' | 'bottom';
  value: AppSection;
}

const sections = [
  { icon: Moon, label: 'Relevo', value: 'handoff' },
  { icon: ClipboardList, label: 'Registro', value: 'history' },
  { icon: Heart, label: 'Bebé', value: 'baby' },
  { icon: House, label: 'Familia', value: 'family' },
] satisfies {
  icon: typeof BabyIcon | typeof Heart | typeof House;
  label: string;
  value: AppSection;
}[];

export function AppSectionNavigation({
  careHistoryAvailable = true,
  onChange,
  placement = 'header',
  value,
}: AppSectionNavigationProps) {
  const isBottom = placement === 'bottom';

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.container, isBottom && styles.containerBottom]}
    >
      {sections.filter(
        (section) => careHistoryAvailable || section.value !== 'history',
      ).map((section) => {
        const selected =
          value === section.value ||
          (value === 'summary' && section.value === 'history') ||
          ((value === 'documents' || value === 'contacts') &&
            section.value === 'baby') ||
          (value === 'activity' && section.value === 'family');

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={section.value}
            onPress={() => onChange(section.value)}
            style={({ pressed }) => [
              styles.item,
              isBottom && styles.itemBottom,
              selected && styles.itemSelected,
              selected && isBottom && styles.itemSelectedBottom,
              pressed && styles.itemPressed,
            ]}
          >
            <section.icon
              color={selected ? colors.coral : colors.textMuted}
              size={18}
            />
            <Text
              style={[
                styles.label,
                isBottom && styles.labelBottom,
                selected && styles.labelSelected,
              ]}
            >
              {section.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  containerBottom: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    width: '100%',
  },
  item: {
    alignItems: 'center',
    borderRadius: radius.md,
    flexGrow: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 96,
  },
  itemBottom: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
    minHeight: 58,
    minWidth: 0,
  },
  itemSelected: { backgroundColor: colors.surface },
  itemSelectedBottom: { backgroundColor: colors.surface },
  itemPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '800' },
  labelBottom: { fontSize: 11 },
  labelSelected: { color: colors.text },
}));
