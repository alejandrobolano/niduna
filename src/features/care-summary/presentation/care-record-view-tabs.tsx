import { BarChart3, List } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

type CareRecordView = 'history' | 'summary';

interface CareRecordViewTabsProps {
  onChange: (view: CareRecordView) => void;
  value: CareRecordView;
}

const views = [
  { icon: BarChart3, label: 'Resumen', value: 'summary' },
  { icon: List, label: 'Historial', value: 'history' },
] satisfies {
  icon: typeof BarChart3;
  label: string;
  value: CareRecordView;
}[];

export function CareRecordViewTabs({
  onChange,
  value,
}: CareRecordViewTabsProps) {
  return (
    <View accessibilityRole="tablist" style={styles.container}>
      {views.map((view) => {
        const selected = view.value === value;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={view.value}
            onPress={() => onChange(view.value)}
            style={({ pressed }) => [
              styles.tab,
              selected && styles.tabSelected,
              pressed && styles.tabPressed,
            ]}
          >
            <view.icon
              color={selected ? colors.primaryPressed : colors.textMuted}
              size={17}
            />
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {view.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: {
    alignSelf: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    flexDirection: 'row',
    padding: spacing.xs,
    width: '100%',
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  labelSelected: { color: colors.text },
  tab: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  tabPressed: { opacity: 0.72 },
  tabSelected: { backgroundColor: colors.surface },
}));
