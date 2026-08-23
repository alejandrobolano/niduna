import { Check, ChevronDown, Clock, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const itemHeight = 48;
const visibleItems = 5;
const wheelHeight = itemHeight * visibleItems;
const wheelPadding = (wheelHeight - itemHeight) / 2;

const hours = Array.from({ length: 24 }, (_, value) => String(value).padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, value) => String(value).padStart(2, '0'));

interface WheelColumnProps {
  accessibilityLabel: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}

function WheelColumn({ accessibilityLabel, onChange, options, value }: WheelColumnProps) {
  const listRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, options.indexOf(value));

  useEffect(() => {
    listRef.current?.scrollTo({ animated: false, y: selectedIndex * itemHeight });
  }, [selectedIndex]);

  function selectFromOffset(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.max(
      0,
      Math.min(options.length - 1, Math.round(event.nativeEvent.contentOffset.y / itemHeight)),
    );
    onChange(options[index]);
  }

  function select(valueToSelect: string, index: number) {
    onChange(valueToSelect);
    listRef.current?.scrollTo({ animated: true, y: index * itemHeight });
  }

  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.wheel}>
      <View pointerEvents="none" style={styles.selection} />
      <ScrollView
        contentContainerStyle={styles.wheelContent}
        decelerationRate="fast"
        onMomentumScrollEnd={selectFromOffset}
        onScrollEndDrag={selectFromOffset}
        ref={listRef}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={itemHeight}
        style={styles.wheelList}
      >
        {options.map((option, index) => {
          const selected = option === value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option}
              onPress={() => select(option, index)}
              style={styles.wheelItem}
            >
              <Text style={[styles.wheelValue, selected && styles.wheelValueSelected]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

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

            <View style={styles.columnLabels}>
              <Text style={styles.columnLabel}>Hora</Text>
              <Text style={styles.columnLabel}>Minutos</Text>
            </View>
            <View style={styles.wheels}>
              <WheelColumn
                accessibilityLabel="Seleccionar hora"
                onChange={setDraftHour}
                options={hours}
                value={draftHour}
              />
              <Text pointerEvents="none" style={styles.separator}>:</Text>
              <WheelColumn
                accessibilityLabel="Seleccionar minutos"
                onChange={setDraftMinute}
                options={minutes}
                value={draftMinute}
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
  columnLabels: {
    flexDirection: 'row',
    gap: spacing.xl,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },
  columnLabel: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  wheels: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  wheel: {
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: wheelHeight,
    maxWidth: 132,
    overflow: 'hidden',
    position: 'relative',
    width: '38%',
  },
  wheelList: {
    backgroundColor: 'transparent',
    flexGrow: 0,
    height: wheelHeight,
    zIndex: 1,
  },
  wheelContent: { paddingVertical: wheelPadding },
  selection: {
    backgroundColor: colors.peach,
    borderColor: colors.coral,
    borderRadius: radius.md,
    borderWidth: 1,
    height: itemHeight,
    left: spacing.xs,
    position: 'absolute',
    right: spacing.xs,
    top: wheelPadding,
    zIndex: 0,
  },
  wheelItem: { alignItems: 'center', height: itemHeight, justifyContent: 'center' },
  wheelValue: { color: colors.textMuted, fontSize: 18, fontWeight: '700' },
  wheelValueSelected: { color: colors.text, fontSize: 24, fontWeight: '900' },
  separator: { color: colors.text, fontSize: 30, fontWeight: '900' },
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
