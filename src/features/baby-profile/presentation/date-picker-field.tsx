import { ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  addMonths,
  dateToIso,
  formatDate,
  formatMonth,
  getCalendarDays,
  isoToDate,
} from '@/shared/presentation/date';
import { colors, radius, spacing } from '@/shared/presentation/theme';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

interface DatePickerFieldProps {
  error?: string;
  label: string;
  maximumDate?: string;
  onChange: (value: string) => void;
  value?: string;
}

export function DatePickerField({
  error,
  label,
  maximumDate,
  onChange,
  value,
}: DatePickerFieldProps) {
  const initialDate = isoToDate(value) ?? new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12),
  );
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  function openPicker() {
    const selectedDate = isoToDate(value) ?? new Date();
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12));
    setIsOpen(true);
  }

  function selectDate(isoDate: string) {
    onChange(isoDate);
    setIsOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityHint="Abre un calendario para elegir la fecha"
        accessibilityLabel={`${label}. ${formatDate(value) || 'Sin seleccionar'}`}
        accessibilityRole="button"
        onPress={openPicker}
        style={({ pressed }) => [
          styles.trigger,
          error && styles.triggerError,
          pressed && styles.triggerPressed,
        ]}
      >
        <View style={styles.calendarIcon}>
          <Text style={styles.calendarIconTop}>••</Text>
          <Text style={styles.calendarIconDay}>{isoToDate(value)?.getDate() ?? '–'}</Text>
        </View>
        <View style={styles.triggerCopy}>
          <Text style={[styles.value, !value && styles.placeholder]}>
            {formatDate(value) || 'Seleccionar fecha'}
          </Text>
          <Text style={styles.triggerHint}>Toca para abrir el calendario</Text>
        </View>
        <ChevronDown color={colors.primaryPressed} size={20} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Cerrar calendario"
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={styles.backdrop}
          />
          <View accessibilityViewIsModal style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>ELIGE UNA FECHA</Text>
                <Text style={styles.sheetTitle}>{label}</Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar calendario"
                accessibilityRole="button"
                onPress={() => setIsOpen(false)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.controlPressed]}
              >
                <X color={colors.text} size={20} />
              </Pressable>
            </View>

            <View style={styles.monthControls}>
              <Pressable
                accessibilityLabel="Mes anterior"
                accessibilityRole="button"
                onPress={() => setVisibleMonth((month) => addMonths(month, -1))}
                style={({ pressed }) => [styles.monthButton, pressed && styles.controlPressed]}
              >
                <ChevronLeft color={colors.primaryPressed} size={20} />
              </Pressable>
              <Text style={styles.monthLabel}>{formatMonth(visibleMonth)}</Text>
              <Pressable
                accessibilityLabel="Mes siguiente"
                accessibilityRole="button"
                onPress={() => setVisibleMonth((month) => addMonths(month, 1))}
                style={({ pressed }) => [styles.monthButton, pressed && styles.controlPressed]}
              >
                <ChevronRight color={colors.primaryPressed} size={20} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((weekday) => (
                <Text key={weekday} style={styles.weekday}>
                  {weekday}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((day) => {
                const selected = day.isoDate === value;
                const disabled = maximumDate !== undefined && day.isoDate > maximumDate;
                const today = day.isoDate === dateToIso(new Date());

                return (
                  <View key={day.isoDate} style={styles.daySlot}>
                    <Pressable
                      accessibilityLabel={formatDate(day.isoDate)}
                      accessibilityRole="button"
                      accessibilityState={{ disabled, selected }}
                      disabled={disabled}
                      onPress={() => selectDate(day.isoDate)}
                      style={({ pressed }) => [
                        styles.day,
                        today && styles.dayToday,
                        selected && styles.daySelected,
                        pressed && !disabled && styles.dayPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !day.isCurrentMonth && styles.dayTextMuted,
                          disabled && styles.dayTextDisabled,
                          selected && styles.dayTextSelected,
                        ]}
                      >
                        {day.date.getDate()}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={styles.sheetFooter}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const today = new Date();
                  setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12));
                }}
                style={({ pressed }) => [styles.todayButton, pressed && styles.controlPressed]}
              >
                <Text style={styles.todayButtonText}>Ir a hoy</Text>
              </Pressable>
              <Text style={styles.selectedDate}>
                {formatDate(value) || 'Aún no has elegido una fecha'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  trigger: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.md,
  },
  triggerError: { borderColor: colors.error },
  triggerPressed: { backgroundColor: colors.aquaSoft, transform: [{ scale: 0.995 }] },
  calendarIcon: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: radius.sm,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  calendarIconTop: {
    color: colors.coral,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 10,
  },
  calendarIconDay: { color: colors.text, fontSize: 17, fontWeight: '900' },
  triggerCopy: { flex: 1 },
  value: { color: colors.text, fontSize: 15, fontWeight: '700' },
  placeholder: { color: colors.textMuted },
  triggerHint: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  error: { color: colors.error, fontSize: 12, lineHeight: 17 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    backgroundColor: 'rgba(24, 35, 75, 0.42)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  sheet: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxWidth: 560,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    width: '100%',
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 4,
    marginBottom: spacing.lg,
    width: 46,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  sheetEyebrow: {
    color: colors.coral,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: spacing.xs },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  controlPressed: { opacity: 0.66, transform: [{ scale: 0.96 }] },
  monthControls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  monthButton: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  monthLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  weekRow: { flexDirection: 'row', marginTop: spacing.lg },
  weekday: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  daySlot: { alignItems: 'center', aspectRatio: 1, justifyContent: 'center', width: '14.2857%' },
  day: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  dayToday: { borderColor: colors.butter, borderWidth: 2 },
  daySelected: { backgroundColor: colors.coral },
  dayPressed: { backgroundColor: colors.peach },
  dayText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  dayTextMuted: { color: colors.textMuted },
  dayTextDisabled: { color: colors.border },
  dayTextSelected: { color: colors.white, fontWeight: '900' },
  sheetFooter: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.lg,
  },
  todayButton: {
    backgroundColor: colors.butterSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  todayButtonText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  selectedDate: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'right',
  },
});
