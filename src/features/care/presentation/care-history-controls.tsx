import { ChevronLeft, ChevronRight, Download } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  buildMonthCalendar,
  type CareEventFilter,
  type CareHistoryPageSize,
} from '@/features/care/application/care-history';
import type { CareEvent } from '@/features/care/domain/care-event';
import { colors, radius, spacing } from '@/shared/presentation/theme';

const filterOptions = [
  { label: 'Todo', value: 'all' },
  { label: 'Alimentación', value: 'feeding' },
  { label: 'Pañales', value: 'diaper' },
  { label: 'Sueño', value: 'sleep' },
  { label: 'Medidas', value: 'measurement' },
  { label: 'Notas', value: 'note' },
] satisfies { label: string; value: CareEventFilter }[];

const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const eventColors: Record<CareEvent['type'], string> = {
  diaper: colors.butter,
  feeding: colors.coral,
  sleep: colors.lavender,
  measurement: colors.aqua,
  note: colors.primary,
};

const pageSizes = [20, 50, 100] as const;

interface CareHistoryControlsProps {
  eventFilter: CareEventFilter;
  events: CareEvent[];
  exportCount: number;
  isExporting: boolean;
  onChangeDate: (dateKey: string | undefined) => void;
  onChangeFilter: (filter: CareEventFilter) => void;
  onChangePage: (page: number) => void;
  onChangePageSize: (pageSize: CareHistoryPageSize) => void;
  onExport: () => void;
  page: number;
  pageSize: CareHistoryPageSize;
  selectedDate?: string;
  totalPages: number;
}

export function CareHistoryControls({
  eventFilter,
  events,
  exportCount,
  isExporting,
  onChangeDate,
  onChangeFilter,
  onChangePage,
  onChangePageSize,
  onExport,
  page,
  pageSize,
  selectedDate,
  totalPages,
}: CareHistoryControlsProps) {
  const initialDate = events[0]
    ? new Date(events[0].occurredAt)
    : new Date();
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

  function changeMonth(offset: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.title}>Consultar historial</Text>
          <Text style={styles.subtitle}>
            Filtra por cuidado o elige un día del calendario.
          </Text>
        </View>
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
              {isExporting ? 'Preparando…' : 'Exportar para Excel'}
            </Text>
            <Text style={styles.exportHint}>
              {exportCount} {exportCount === 1 ? 'registro' : 'registros'} · CSV
            </Text>
          </View>
        </Pressable>
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
              <Text
                style={[
                  styles.filterText,
                  selected && styles.filterTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.paginationRow}>
        <View style={styles.pageSizes}>
          <Text style={styles.pageSizeLabel}>Mostrar</Text>
          {pageSizes.map((size) => {
            const selected = size === pageSize;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={size}
                onPress={() => onChangePageSize(size)}
                style={[
                  styles.pageSize,
                  selected && styles.pageSizeSelected,
                ]}
              >
                <Text
                  style={[
                    styles.pageSizeText,
                    selected && styles.pageSizeTextSelected,
                  ]}
                >
                  {size}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.pageNavigation}>
          <Pressable
            accessibilityLabel="Página anterior"
            disabled={page <= 1}
            onPress={() => onChangePage(page - 1)}
            style={[styles.pageButton, page <= 1 && styles.disabled]}
          >
            <ChevronLeft color={colors.text} size={18} />
          </Pressable>
          <Text style={styles.pageLabel}>
            {page} de {totalPages}
          </Text>
          <Pressable
            accessibilityLabel="Página siguiente"
            disabled={page >= totalPages}
            onPress={() => onChangePage(page + 1)}
            style={[styles.pageButton, page >= totalPages && styles.disabled]}
          >
            <ChevronRight color={colors.text} size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.calendar}>
        <View style={styles.monthHeader}>
          <Pressable
            accessibilityLabel="Mes anterior"
            onPress={() => changeMonth(-1)}
            style={styles.monthButton}
          >
            <ChevronLeft color={colors.text} size={20} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable
            accessibilityLabel="Mes siguiente"
            onPress={() => changeMonth(1)}
            style={styles.monthButton}
          >
            <ChevronRight color={colors.text} size={20} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((day) => (
            <Text key={day} style={styles.weekDay}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.days}>
          {calendar.map((day) => {
            const selected = day.dateKey === selectedDate;

            return (
              <Pressable
                accessibilityLabel={`Día ${day.day}${
                  day.eventTypes.length > 0
                    ? `, ${day.eventTypes.length} tipos de cuidado`
                    : ', sin registros'
                }`}
                accessibilityState={{ selected }}
                key={day.dateKey}
                onPress={() =>
                  onChangeDate(selected ? undefined : day.dateKey)
                }
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
                <View style={styles.eventDots}>
                  {day.eventTypes.map((type) => (
                    <View
                      key={type}
                      style={[
                        styles.eventDot,
                        { backgroundColor: eventColors[type] },
                      ]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {selectedDate ? (
          <Pressable
            onPress={() => onChangeDate(undefined)}
            style={styles.clearDate}
          >
            <Text style={styles.clearDateText}>
              Ver todos los días
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  exportButton: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  exportLabel: {
    color: colors.primaryPressed,
    fontSize: 13,
    fontWeight: '900',
  },
  exportHint: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paginationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  pageSizes: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  pageSizeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  pageSize: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pageSizeSelected: { backgroundColor: colors.text },
  pageSizeText: { color: colors.textMuted, fontSize: 11, fontWeight: '900' },
  pageSizeTextSelected: { color: colors.white },
  pageNavigation: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  pageButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  pageLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  filter: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterSelected: { backgroundColor: colors.text },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  filterTextSelected: { color: colors.white },
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
    height: 47,
    justifyContent: 'center',
    width: '14.2857%',
  },
  daySelected: { backgroundColor: colors.text },
  dayText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  dayTextOutside: { color: colors.border },
  dayTextSelected: { color: colors.white },
  eventDots: {
    flexDirection: 'row',
    gap: 2,
    height: 5,
    marginTop: 3,
  },
  eventDot: { borderRadius: radius.pill, height: 4, width: 4 },
  clearDate: { alignSelf: 'center', padding: spacing.sm },
  clearDateText: {
    color: colors.primaryPressed,
    fontSize: 12,
    fontWeight: '900',
  },
});
