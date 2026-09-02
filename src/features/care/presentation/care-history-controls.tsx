import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  buildMonthCalendar,
  type CareEventFilter,
} from '@/features/care/application/care-history';
import type { CareEvent } from '@/features/care/domain/care-event';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const filterOptions = [
  { label: 'Todo', value: 'all' },
  { label: 'Alimentación', value: 'feeding' },
  { label: 'Pañales', value: 'diaper' },
  { label: 'Sueño', value: 'sleep' },
  { label: 'Medidas', value: 'measurement' },
  { label: 'Notas', value: 'note' },
] satisfies { label: string; value: CareEventFilter }[];

const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface CareHistoryControlsProps {
  eventFilter: CareEventFilter;
  events: CareEvent[];
  exportCount: number;
  isExporting: boolean;
  isReportPreparing: boolean;
  isSelectionExport: boolean;
  onChangeDate: (dateKey: string | undefined) => void;
  onChangeFilter: (filter: CareEventFilter) => void;
  onExport: () => void;
  onOpenReport: () => void;
  selectedDate?: string;
}

export function CareHistoryControls({
  eventFilter,
  events,
  exportCount,
  isExporting,
  isReportPreparing,
  isSelectionExport,
  onChangeDate,
  onChangeFilter,
  onExport,
  onOpenReport,
  selectedDate,
}: CareHistoryControlsProps) {
  const initialDate = events[0] ? new Date(events[0].occurredAt) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const calendar = useMemo(
    () =>
      buildMonthCalendar(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth(),
        events,
      ),
    [events, visibleMonth],
  );
  const monthLabel = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Consultar registros</Text>
          <Text style={styles.subtitle}>Filtra por tipo o selecciona una fecha.</Text>
        </View>
        <View style={styles.exportActions}>
          <Pressable
            accessibilityRole="button"
            disabled={isExporting || exportCount === 0}
            onPress={onExport}
            style={({ pressed }) => [
              styles.exportButton,
              pressed && styles.pressed,
              (isExporting || exportCount === 0) && styles.disabled,
            ]}
          >
            <Download color={colors.primaryPressed} size={18} />
            <View>
              <Text style={styles.exportLabel}>
                {isExporting ? 'Preparando…' : 'Excel'}
              </Text>
              <Text style={styles.exportHint}>
                {exportCount} {isSelectionExport ? 'seleccionados' : 'registros'} · CSV
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isReportPreparing || exportCount === 0}
            onPress={onOpenReport}
            style={({ pressed }) => [
              styles.reportButton,
              pressed && styles.pressed,
              (isReportPreparing || exportCount === 0) && styles.disabled,
            ]}
          >
            <FileText color={colors.onAccent} size={18} />
            <View>
              <Text style={styles.reportLabel}>
                {isReportPreparing ? 'Preparando…' : 'Informe PDF'}
              </Text>
              <Text style={styles.reportHint}>
                {isSelectionExport ? `${exportCount} seleccionados` : 'Personalizar'}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View accessibilityRole="tablist" style={styles.filters}>
        {filterOptions.map((option) => {
          const selected = option.value === eventFilter;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => onChangeFilter(option.value)}
              style={({ pressed }) => [
                styles.filter,
                selected && styles.filterSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.calendar}>
        <View style={styles.monthHeader}>
          <Pressable
            accessibilityLabel="Mes anterior"
            onPress={() =>
              setVisibleMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() - 1, 1),
              )
            }
            style={styles.monthButton}
          >
            <ChevronLeft color={colors.text} size={20} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable
            accessibilityLabel="Mes siguiente"
            onPress={() =>
              setVisibleMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() + 1, 1),
              )
            }
            style={styles.monthButton}
          >
            <ChevronRight color={colors.text} size={20} />
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {weekDays.map((day) => (
            <Text key={day} style={styles.weekDay}>{day}</Text>
          ))}
        </View>
        <View style={styles.days}>
          {calendar.map((day) => {
            const selected = day.dateKey === selectedDate;
            return (
              <Pressable
                accessibilityLabel={`Día ${day.day}`}
                accessibilityState={{ selected }}
                key={day.dateKey}
                onPress={() => onChangeDate(selected ? undefined : day.dateKey)}
                style={({ pressed }) => [
                  styles.day,
                  selected && styles.daySelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !day.isCurrentMonth && styles.dayTextOutside,
                    selected && styles.dayTextSelected,
                  ]}
                >
                  {day.day}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedDate ? (
          <Pressable onPress={() => onChangeDate(undefined)} style={styles.clearDate}>
            <Text style={styles.clearDateText}>Ver todos los días</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  exportButton: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  exportActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  exportLabel: { color: colors.primaryPressed, fontSize: 13, fontWeight: '900' },
  exportHint: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  reportButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryPressed,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  reportLabel: { color: colors.onAccent, fontSize: 13, fontWeight: '900' },
  reportHint: { color: colors.onAccent, fontSize: 10, marginTop: 2, opacity: 0.76 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filter: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterSelected: { backgroundColor: colors.text },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  filterTextSelected: { color: colors.onAccent },
  calendar: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.md,
  },
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  monthLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  weekRow: { flexDirection: 'row' },
  weekDay: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  days: { flexDirection: 'row', flexWrap: 'wrap' },
  day: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 42,
    justifyContent: 'center',
    width: '14.2857%',
  },
  daySelected: { backgroundColor: colors.text },
  dayText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  dayTextOutside: { color: colors.border },
  dayTextSelected: { color: colors.onAccent },
  clearDate: { alignSelf: 'center', padding: spacing.sm },
  clearDateText: { color: colors.primaryPressed, fontSize: 12, fontWeight: '900' },
}));
