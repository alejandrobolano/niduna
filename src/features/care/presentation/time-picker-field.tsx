import { Check, ChevronDown, Clock, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import { TimeWheelPicker } from '@/features/care/presentation/time-wheel-picker';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface TimePickerFieldProps {
  hour: string;
  minute: string;
  onHourChange: (value: string) => void;
  onMinuteChange: (value: string) => void;
}

export function TimePickerField({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: TimePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftHour, setDraftHour] = useState(hour);
  const [draftMinute, setDraftMinute] = useState(minute);

  function open() {
    setDraftHour(hour);
    setDraftMinute(minute);
    setIsOpen(true);
  }

  function confirm() {
    onHourChange(draftHour);
    onMinuteChange(draftMinute);
    setIsOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Hora</Text>
      <Pressable
        accessibilityHint="Abre un selector de hora y minutos"
        accessibilityLabel={`Hora. ${hour}:${minute}`}
        accessibilityRole="button"
        onPress={open}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <View style={styles.icon}>
          <Clock color={colors.coralPressed} size={21} />
        </View>
        <View style={styles.triggerCopy}>
          <Text style={styles.triggerValue}>{hour}:{minute}</Text>
          <Text style={styles.triggerHint}>Toca para ajustar la hora</Text>
        </View>
        <ChevronDown color={colors.coralPressed} size={20} />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Cerrar selector de hora"
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={styles.backdrop}
          />
          <View accessibilityViewIsModal style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.eyebrow}>AJUSTA EL MOMENTO</Text>
                <Text style={styles.title}>Hora del registro</Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar selector de hora"
                accessibilityRole="button"
                onPress={() => setIsOpen(false)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <X color={colors.text} size={20} />
              </Pressable>
            </View>

            <View style={styles.picker}>
              <TimeWheelPicker
                hour={draftHour}
                minute={draftMinute}
                onHourChange={setDraftHour}
                onMinuteChange={setDraftMinute}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={confirm}
              style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmPressed]}
            >
              <Check color={colors.onAccent} size={18} />
              <Text style={styles.confirmText}>Usar {draftHour}:{draftMinute}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
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
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  triggerCopy: { flex: 1 },
  triggerValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
  triggerHint: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
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
    maxWidth: 480,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
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
  },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: spacing.xs },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  picker: { marginTop: spacing.xl },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.xl,
    minHeight: 52,
  },
  confirmPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  confirmText: { color: colors.onAccent, fontSize: 15, fontWeight: '900' },
}));
