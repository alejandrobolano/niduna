import { Archive, Clock3, X } from 'lucide-react-native';
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

interface CareRetireConfirmationModalProps {
  babyName: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  recordCount: number;
}

export function CareRetireConfirmationModal({
  babyName,
  isSubmitting,
  onCancel,
  onConfirm,
  recordCount,
}: CareRetireConfirmationModalProps) {
  const isSingleRecord = recordCount === 1;
  const close = () => {
    if (!isSubmitting) {
      onCancel();
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={recordCount > 0}
    >
      <SafeAreaView style={styles.root}>
        <Pressable
          accessibilityLabel="Cancelar retirada"
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={close}
          style={styles.backdrop}
        />
        <View
          accessibilityLabel="Confirmar retirada de registros"
          accessibilityViewIsModal
          style={styles.card}
        >
          <View style={styles.heading}>
            <View style={styles.iconContainer}>
              <Archive color={colors.error} size={24} />
            </View>
            <Pressable
              accessibilityLabel="Cerrar confirmación"
              accessibilityRole="button"
              disabled={isSubmitting}
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
            <Text style={styles.eyebrow}>CONFIRMAR RETIRADA</Text>
            <Text style={styles.title}>
              {isSingleRecord
                ? '¿Quitar este registro del relevo?'
                : `¿Quitar ${recordCount} registros del relevo?`}
            </Text>
            <Text style={styles.description}>
              {isSingleRecord ? 'Dejará' : 'Dejarán'} de aparecer en el relevo de{' '}
              {babyName}.
            </Text>
          </View>

          <View style={styles.retentionNotice}>
            <View style={styles.clockContainer}>
              <Clock3 color={colors.primaryPressed} size={20} />
            </View>
            <View style={styles.retentionCopy}>
              <Text style={styles.retentionTitle}>
                30 días para {isSingleRecord ? 'recuperarlo' : 'recuperarlos'}
              </Text>
              <Text style={styles.retentionText}>
                Después {isSingleRecord ? 'se eliminará' : 'se eliminarán'} definitivamente.
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={close}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                pressed && styles.pressed,
                isSubmitting && styles.disabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.confirmText}>
                  {isSingleRecord ? 'Quitar registro' : `Quitar ${recordCount} registros`}
                </Text>
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
    backgroundColor: colors.peach,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  copy: { gap: spacing.sm },
  eyebrow: {
    color: colors.coralPressed,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 31,
  },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  retentionNotice: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  clockContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  retentionCopy: { flex: 1, gap: 2 },
  retentionTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  retentionText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
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
  confirmButton: { backgroundColor: colors.error },
  cancelText: { color: colors.text, fontSize: 14, fontWeight: '900' },
  confirmText: { color: colors.white, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.68 },
});
