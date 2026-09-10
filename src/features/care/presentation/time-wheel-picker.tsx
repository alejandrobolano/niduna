import { useEffect, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const itemHeight = 48;
const hours = Array.from({ length: 24 }, (_, value) => String(value).padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, value) => String(value).padStart(2, '0'));

interface WheelColumnProps {
  accessibilityLabel: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
  visibleItems: number;
}

function WheelColumn({
  accessibilityLabel,
  onChange,
  options,
  value,
  visibleItems,
}: WheelColumnProps) {
  const listRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, options.indexOf(value));
  const wheelHeight = itemHeight * visibleItems;
  const wheelPadding = (wheelHeight - itemHeight) / 2;

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
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.wheel, { height: wheelHeight }]}
    >
      <View
        pointerEvents="none"
        style={[styles.selection, { top: wheelPadding }]}
      />
      <ScrollView
        contentContainerStyle={{ paddingVertical: wheelPadding }}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={selectFromOffset}
        onScrollEndDrag={selectFromOffset}
        ref={listRef}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={itemHeight}
        style={[styles.wheelList, { height: wheelHeight }]}
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

interface TimeWheelPickerProps {
  compact?: boolean;
  hour: string;
  hourOptions?: string[];
  minute: string;
  minuteOptions?: string[];
  onHourChange: (value: string) => void;
  onMinuteChange: (value: string) => void;
}

export function TimeWheelPicker({
  compact = false,
  hour,
  hourOptions = hours,
  minute,
  minuteOptions = minutes,
  onHourChange,
  onMinuteChange,
}: TimeWheelPickerProps) {
  const visibleItems = compact ? 3 : 5;

  return (
    <View style={styles.container}>
      <View style={styles.columnLabels}>
        <Text style={styles.columnLabel}>Hora</Text>
        <Text style={styles.columnLabel}>Minutos</Text>
      </View>
      <View style={styles.wheels}>
        <WheelColumn
          accessibilityLabel="Seleccionar hora"
          onChange={onHourChange}
          options={hourOptions}
          value={hour}
          visibleItems={visibleItems}
        />
        <Text pointerEvents="none" style={styles.separator}>:</Text>
        <WheelColumn
          accessibilityLabel="Seleccionar minutos"
          onChange={onMinuteChange}
          options={minuteOptions}
          value={minute}
          visibleItems={visibleItems}
        />
      </View>
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  container: { gap: spacing.sm },
  columnLabels: {
    flexDirection: 'row',
    gap: 52,
    justifyContent: 'center',
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
    maxWidth: 132,
    overflow: 'hidden',
    position: 'relative',
    width: '38%',
  },
  wheelList: {
    backgroundColor: 'transparent',
    flexGrow: 0,
    zIndex: 1,
  },
  selection: {
    backgroundColor: colors.peach,
    borderColor: colors.coral,
    borderRadius: radius.md,
    borderWidth: 1,
    height: itemHeight,
    left: spacing.xs,
    position: 'absolute',
    right: spacing.xs,
    zIndex: 0,
  },
  wheelItem: { alignItems: 'center', height: itemHeight, justifyContent: 'center' },
  wheelValue: { color: colors.textMuted, fontSize: 18, fontWeight: '700' },
  wheelValueSelected: { color: colors.text, fontSize: 24, fontWeight: '900' },
  separator: { color: colors.text, fontSize: 30, fontWeight: '900' },
}));
