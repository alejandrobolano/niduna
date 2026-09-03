import { Check, ChevronDown, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';
import { resolveBabyAvatar, resolveMemberAvatar } from '@/features/avatars/domain/avatar';
import { AnimalAvatar } from '@/features/avatars/presentation/animal-avatar';

export interface SelectOption<T extends string> {
  avatarSeed?: string;
  avatarType?: 'baby' | 'member';
  imageUrl?: string;
  label: string;
  supportingText?: string;
  value: T;
}

function OptionAvatar<T extends string>({ option, size }: { option: SelectOption<T>; size: number }) {
  if (!option.avatarSeed || !option.avatarType) return null;

  const variant = option.avatarType === 'baby'
    ? resolveBabyAvatar(option.avatarSeed)
    : resolveMemberAvatar(option.avatarSeed);

  return (
    <AnimalAvatar
      accessibilityLabel={`Avatar de ${option.label}`}
      photoUrl={option.imageUrl}
      size={size}
      variant={variant}
    />
  );
}

function getOptionMark(label: string): string {
  return label.length <= 3 ? label : label.slice(0, 1).toLocaleUpperCase('es');
}

interface SelectFieldProps<T extends string> {
  disabled?: boolean;
  eyebrow?: string;
  error?: string;
  hint?: string;
  label: string;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder: string;
  title: string;
  value?: T;
}

export function SelectField<T extends string>({
  disabled = false,
  eyebrow = 'ELIGE UNA OPCIÓN',
  error,
  hint,
  label,
  onChange,
  options,
  placeholder,
  title,
  value,
}: SelectFieldProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  function select(option: SelectOption<T>) {
    onChange(option.value);
    setIsOpen(false);
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityHint={`Abre la lista de opciones para ${label.toLocaleLowerCase('es')}`}
        accessibilityLabel={`${label}. ${selectedOption?.label ?? 'Sin seleccionar'}`}
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => {
          if (!disabled) {
            setIsOpen(true);
          }
        }}
        style={({ pressed }) => [
          styles.trigger,
          error && styles.triggerError,
          disabled && styles.triggerDisabled,
          pressed && !disabled && styles.triggerPressed,
        ]}
      >
        {selectedOption?.avatarSeed && selectedOption.avatarType ? (
          <OptionAvatar option={selectedOption} size={44} />
        ) : selectedOption?.imageUrl ? (
          <Image
            accessibilityLabel={`Foto de ${selectedOption.label}`}
            cachePolicy="memory-disk"
            contentFit="cover"
            source={selectedOption.imageUrl}
            style={styles.optionImage}
          />
        ) : (
          <View style={styles.dropIcon}>
            <View style={styles.dropTop} />
            <View style={styles.dropBody}>
              <Text numberOfLines={1} style={styles.dropText}>
                {selectedOption ? getOptionMark(selectedOption.label) : '?'}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.triggerCopy}>
          <Text style={[styles.value, !selectedOption && styles.placeholder]}>
            {selectedOption?.label ?? placeholder}
          </Text>
          <Text style={styles.triggerHint}>Toca para elegir una opción</Text>
        </View>
        <ChevronDown color={colors.coralPressed} size={20} />
      </Pressable>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Cerrar selector"
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={styles.backdrop}
          />
          <View accessibilityViewIsModal style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>{eyebrow}</Text>
                <Text style={styles.sheetTitle}>{title}</Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar selector"
                accessibilityRole="button"
                onPress={() => setIsOpen(false)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <X color={colors.text} size={20} />
              </Pressable>
            </View>
            <View style={styles.options}>
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={option.value}
                    onPress={() => select(option)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    {option.avatarSeed && option.avatarType ? (
                      <OptionAvatar option={option} size={38} />
                    ) : option.imageUrl ? (
                      <Image
                        accessibilityLabel={`Foto de ${option.label}`}
                        cachePolicy="memory-disk"
                        contentFit="cover"
                        source={option.imageUrl}
                        style={[styles.optionMark, styles.optionImage]}
                      />
                    ) : (
                      <View style={[styles.optionMark, selected && styles.optionMarkSelected]}>
                        <Text style={[styles.optionMarkText, selected && styles.optionMarkTextSelected]}>
                          {selected ? <Check color={colors.onAccent} size={16} /> : getOptionMark(option.label)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.optionCopy}>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      {option.supportingText ? (
                        <Text style={styles.optionSupporting}>{option.supportingText}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
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
  triggerError: { borderColor: colors.error },
  triggerDisabled: { opacity: 0.65 },
  triggerPressed: { backgroundColor: colors.peach, transform: [{ scale: 0.995 }] },
  dropIcon: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  dropTop: {
    backgroundColor: colors.coral,
    borderRadius: 3,
    height: 12,
    marginBottom: -4,
    transform: [{ rotate: '45deg' }],
    width: 12,
  },
  dropBody: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  dropText: { color: colors.coralPressed, fontSize: 11, fontWeight: '900' },
  triggerCopy: { flex: 1 },
  value: { color: colors.text, fontSize: 15, fontWeight: '700' },
  placeholder: { color: colors.textMuted },
  triggerHint: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
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
    paddingBottom: spacing.xxl,
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
    letterSpacing: 1.6,
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
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 68,
    padding: spacing.md,
    width: '48.5%',
  },
  optionSelected: { backgroundColor: colors.peach, borderColor: colors.coral },
  optionMark: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  optionMarkSelected: { backgroundColor: colors.coral },
  optionImage: { borderRadius: radius.pill, height: 44, width: 44 },
  optionMarkText: { color: colors.textMuted, fontSize: 10, fontWeight: '900' },
  optionMarkTextSelected: { color: colors.onAccent, fontSize: 16 },
  optionCopy: { flex: 1 },
  optionLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  optionSupporting: { color: colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 2 },
}));
