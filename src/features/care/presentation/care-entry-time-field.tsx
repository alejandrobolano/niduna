import { Clock3 } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  careEntryMaximumLookbackMinutes,
  careEntryMinuteOffsets,
  getCareEntryClockTimes,
  type CareEntryTimeSelection,
  resolveCareEntryTime,
} from '@/features/care/domain/care-entry-time';
import { TimeWheelPicker } from '@/features/care/presentation/time-wheel-picker';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface CareEntryTimeFieldProps {
  onChange: (selection: CareEntryTimeSelection) => void;
  selection: CareEntryTimeSelection;
}

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
});

function formatSelection(selection: CareEntryTimeSelection, now: Date): string {
  if (selection.kind === 'now') {
    return 'Se guardará con la hora actual';
  }

  const occurrence = resolveCareEntryTime(selection, now);
  const isToday = occurrence.getFullYear() === now.getFullYear()
    && occurrence.getMonth() === now.getMonth()
    && occurrence.getDate() === now.getDate();
  const dayLabel = isToday ? 'Hoy' : 'Ayer';
  return `${dayLabel}, ${timeFormatter.format(occurrence)}`;
}

function formatClockValue(value: number): string {
  return String(value).padStart(2, '0');
}

function findClosestMinute(minutes: number[], currentMinute: number): number {
  return minutes.reduce((closest, minute) =>
    Math.abs(minute - currentMinute) < Math.abs(closest - currentMinute)
      ? minute
      : closest,
  );
}

export function CareEntryTimeField({
  onChange,
  selection,
}: CareEntryTimeFieldProps) {
  const now = new Date();
  const customReferenceAt = selection.kind === 'custom'
    ? selection.referenceAt
    : undefined;
  const allowedClockTimes = useMemo(
    () => customReferenceAt ? getCareEntryClockTimes(customReferenceAt) : [],
    [customReferenceAt],
  );
  const hourOptions = useMemo(
    () => Array.from(new Set(allowedClockTimes.map(({ hour }) => formatClockValue(hour)))),
    [allowedClockTimes],
  );
  const minuteOptions = useMemo(() => {
    if (selection.kind !== 'custom') {
      return [];
    }

    return allowedClockTimes
      .filter(({ hour }) => hour === selection.hour)
      .map(({ minute }) => formatClockValue(minute));
  }, [allowedClockTimes, selection]);

  function chooseCustomTime() {
    onChange({
      hour: now.getHours(),
      kind: 'custom',
      minute: now.getMinutes(),
      referenceAt: now.toISOString(),
    });
  }

  function changeCustomHour(hourValue: string) {
    if (selection.kind !== 'custom') {
      return;
    }

    const hour = Number(hourValue);
    const allowedMinutes = allowedClockTimes
      .filter((time) => time.hour === hour)
      .map((time) => time.minute);
    const minute = allowedMinutes.includes(selection.minute)
      ? selection.minute
      : findClosestMinute(allowedMinutes, selection.minute);

    onChange({ ...selection, hour, minute });
  }

  return (
    <View style={styles.field}>
      <View style={styles.heading}>
        <View style={styles.icon}>
          <Clock3 color={colors.primaryPressed} size={19} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>Momento del registro</Text>
          <Text accessibilityLiveRegion="polite" style={styles.value}>
            {formatSelection(selection, now)}
          </Text>
        </View>
      </View>

      <View accessibilityRole="radiogroup" style={styles.options}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: selection.kind === 'now' }}
          onPress={() => onChange({ kind: 'now' })}
          style={({ pressed }) => [
            styles.option,
            selection.kind === 'now' && styles.optionSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.optionText, selection.kind === 'now' && styles.optionTextSelected]}>
            Ahora
          </Text>
        </Pressable>
        {careEntryMinuteOffsets.map((minutesAgo) => {
          const selected =
            selection.kind === 'offset' && selection.minutesAgo === minutesAgo;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={minutesAgo}
              onPress={() => onChange({
                kind: 'offset',
                minutesAgo,
                referenceAt: new Date().toISOString(),
              })}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                -{minutesAgo} min
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ selected: selection.kind === 'custom' }}
          onPress={chooseCustomTime}
          style={({ pressed }) => [
            styles.option,
            selection.kind === 'custom' && styles.optionSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[
            styles.optionText,
            selection.kind === 'custom' && styles.optionTextSelected,
          ]}>
            Elegir hora
          </Text>
        </Pressable>
      </View>

      {selection.kind === 'custom' ? (
        <View style={styles.customPicker}>
          <TimeWheelPicker
            compact
            hour={String(selection.hour).padStart(2, '0')}
            hourOptions={hourOptions}
            minute={String(selection.minute).padStart(2, '0')}
            minuteOptions={minuteOptions}
            onHourChange={changeCustomHour}
            onMinuteChange={(minute) => onChange({ ...selection, minute: Number(minute) })}
          />
          <Text style={styles.hint}>
            Puedes retroceder hasta {careEntryMaximumLookbackMinutes / 60} horas. Para
            una hora anterior, guarda el cuidado y corrígelo desde Registro.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  field: { gap: spacing.md },
  heading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: { flex: 1, minWidth: 0 },
  label: { color: colors.text, fontSize: 14, fontWeight: '800' },
  value: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  optionTextSelected: { color: colors.onAccent },
  customPicker: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    gap: spacing.md,
    padding: spacing.md,
  },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
}));
