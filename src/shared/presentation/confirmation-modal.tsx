import { X } from 'lucide-react-native';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/shared/presentation/theme';

type ConfirmationTone = 'danger' | 'primary';

interface ConfirmationModalProps {
  accessibilityLabel?: string;
  cancelLabel?: string;
  children?: ReactNode;
  confirmLabel: string;
  description: string;
  eyebrow?: string;
  icon: ReactNode;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone?: ConfirmationTone;
  visible: boolean;
}

export function ConfirmationModal({
  accessibilityLabel,
  cancelLabel = 'Cancelar',
  children,
  confirmLabel,
  description,
  eyebrow = 'CONFIRMAR ACCIÓN',
  icon,
  isPending = false,
  onCancel,
  onConfirm,
  title,
  tone = 'primary',
  visible,
}: ConfirmationModalProps) {
  const close = () => {
    if (!isPending) {
      onCancel();
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <SafeAreaView style={styles.root}>
        <Pressable
          accessibilityLabel="Cancelar"
          accessibilityRole="button"
          disabled={isPending}
          onPress={close}
          style={styles.backdrop}
        />
        <View
          accessibilityLabel={accessibilityLabel ?? title}
          accessibilityViewIsModal
          style={styles.card}
        >
          <View style={styles.heading}>
            <View
              style={[
                styles.iconContainer,
                tone === 'danger' ? styles.dangerIcon : styles.primaryIcon,
              ]}
            >
              {icon}
            </View>
            <Pressable
              accessibilityLabel="Cerrar confirmación"
              accessibilityRole="button"
              disabled={isPending}
              onPress={close}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <X color={colors.text} size={21} />
            </Pressable>
          </View>

          <View style={styles.copy}>
            <Text
              style={[
                styles.eyebrow,
                tone === 'danger' ? styles.dangerEyebrow : styles.primaryEyebrow,
              ]}
            >
              {eyebrow}
            </Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>

          {children}

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isPending}
              onPress={close}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isPending}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                tone === 'danger' ? styles.dangerButton : styles.primaryButton,
                pressed && styles.pressed,
                isPending && styles.disabled,
              ]}
            >
              {isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: 'rgba(24, 35, 75, 0.58)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    elevation: 12,
    gap: spacing.xl,
    maxWidth: 460,
    padding: spacing.xl,
    shadowColor: colors.text,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    width: '100%',
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  dangerIcon: { backgroundColor: colors.peach },
  primaryIcon: { backgroundColor: colors.aquaSoft },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: { gap: spacing.sm },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  dangerEyebrow: { color: colors.coralPressed },
  primaryEyebrow: { color: colors.primaryPressed },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 31,
  },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: spacing.md },
  button: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  cancelButton: { backgroundColor: colors.surfaceMuted },
  dangerButton: { backgroundColor: colors.error },
  primaryButton: { backgroundColor: colors.primaryPressed },
  cancelText: { color: colors.text, fontSize: 14, fontWeight: '900' },
  confirmText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.68 },
});
