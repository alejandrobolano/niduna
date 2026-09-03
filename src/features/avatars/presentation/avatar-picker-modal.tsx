import { Camera, Check, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AnimalAvatarVariant } from '@/features/avatars/domain/avatar';
import { AnimalAvatar } from '@/features/avatars/presentation/animal-avatar';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const labels: Record<AnimalAvatarVariant, string> = {
  rabbit: 'Conejito',
  bear: 'Osito',
  fox: 'Zorrito',
  koala: 'Koala',
  otter: 'Nutria',
  owl: 'Búho',
  chick: 'Pollito',
  lamb: 'Corderito',
  seal: 'Foquita',
};

interface AvatarPickerModalProps<T extends AnimalAvatarVariant> {
  current: T;
  hasPhoto: boolean;
  onClose: () => void;
  onPickPhoto?: () => Promise<void> | void;
  onRemovePhoto?: () => Promise<void> | void;
  onSelect: (avatar: T) => Promise<void> | void;
  title: string;
  variants: readonly T[];
  visible: boolean;
}

export function AvatarPickerModal<T extends AnimalAvatarVariant>({
  current,
  hasPhoto,
  onClose,
  onPickPhoto,
  onRemovePhoto,
  onSelect,
  title,
  variants,
  visible,
}: AvatarPickerModalProps<T>) {
  const [isBusy, setIsBusy] = useState(false);

  async function run(action: () => Promise<void> | void, closeAfter = false) {
    setIsBusy(true);
    try {
      await action();
      if (closeAfter) onClose();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Cerrar selector de avatar" accessibilityRole="button" onPress={onClose} style={styles.backdrop} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.sheet}>
            <View style={styles.heading}>
              <View style={styles.headingCopy}>
                <Text style={styles.eyebrow}>TU PERSONAJE</Text>
                <Text style={styles.title}>{title}</Text>
              </View>
              <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <X color={colors.text} size={22} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.grid}>
              {variants.map((variant) => {
                const selected = variant === current;
                return (
                  <Pressable
                    accessibilityLabel={`Elegir ${labels[variant]}`}
                    accessibilityRole="button"
                    disabled={isBusy}
                    key={variant}
                    onPress={() => void run(() => onSelect(variant), true)}
                    style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
                  >
                    <AnimalAvatar accessibilityLabel={labels[variant]} size={64} variant={variant} />
                    <Text style={styles.optionLabel}>{labels[variant]}</Text>
                    {selected ? <View style={styles.check}><Check color={colors.onAccent} size={13} /></View> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            {hasPhoto ? (
              <Text style={styles.photoNotice}>
                La foto seguirá siendo el avatar visible hasta que la retires.
              </Text>
            ) : null}
            {onPickPhoto ? (
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" disabled={isBusy} onPress={() => void run(onPickPhoto, true)} style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}>
                  <Camera color={colors.primaryPressed} size={18} />
                  <Text style={styles.photoButtonText}>{hasPhoto ? 'Cambiar foto' : 'Elegir una foto'}</Text>
                </Pressable>
                {hasPhoto && onRemovePhoto ? (
                  <Pressable accessibilityRole="button" disabled={isBusy} onPress={() => void run(onRemovePhoto, true)} style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                    <Trash2 color={colors.error} size={17} />
                    <Text style={styles.removeButtonText}>Retirar foto</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(16, 24, 48, 0.58)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  safeArea: { justifyContent: 'flex-end' },
  sheet: { alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.lg, maxWidth: 620, padding: spacing.xl, width: '100%' },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headingCopy: { flex: 1, gap: spacing.xs },
  eyebrow: { color: colors.coral, fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 23, fontWeight: '900' },
  closeButton: { alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.pill, height: 44, justifyContent: 'center', width: 44 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  option: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.xs, minWidth: 104, padding: spacing.md, position: 'relative' },
  optionSelected: { borderColor: colors.coral, borderWidth: 2 },
  optionLabel: { color: colors.text, fontSize: 12, fontWeight: '800' },
  check: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: radius.pill, height: 22, justifyContent: 'center', position: 'absolute', right: 7, top: 7, width: 22 },
  photoNotice: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  actions: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.sm, paddingTop: spacing.lg },
  photoButton: { alignItems: 'center', backgroundColor: colors.aquaSoft, borderRadius: radius.md, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 50 },
  photoButtonText: { color: colors.primaryPressed, fontSize: 14, fontWeight: '900' },
  removeButton: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 42 },
  removeButtonText: { color: colors.error, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
}));
