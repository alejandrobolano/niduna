import { X } from 'lucide-react-native';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';

import { KeyboardAwareScrollView } from '@/shared/presentation/keyboard-aware-scroll-view';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface ResourceFormCardProps extends PropsWithChildren {
  tone?: 'plain' | 'outlined';
}

interface ResponsiveFieldRowProps extends PropsWithChildren {
  compact: boolean;
  gap?: 'medium' | 'large';
}

interface ResourceFormModalProps extends PropsWithChildren {
  icon?: ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
}

export function ResourceFormModal({
  children,
  icon,
  onClose,
  title,
  visible,
}: ResourceFormModalProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        style={styles.modalBackdrop}
      >
        <Pressable
          accessibilityLabel="Cerrar formulario"
          onPress={onClose}
          style={styles.modalDismissArea}
        />
        <View accessibilityViewIsModal style={styles.modalSheet}>
          <View style={styles.modalHeading}>
            <View style={styles.modalTitleRow}>
              {icon ? <View style={styles.modalIcon}>{icon}</View> : null}
              <Text style={styles.modalTitle}>{title}</Text>
            </View>
            <Pressable
              accessibilityLabel="Cerrar formulario"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.modalClose}
            >
              <X color={colors.text} size={20} />
            </Pressable>
          </View>
          <KeyboardAwareScrollView
            contentContainerStyle={styles.modalForm}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </KeyboardAwareScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ResourceFormCard({
  children,
  tone = 'plain',
}: ResourceFormCardProps) {
  return (
    <View style={[styles.formCard, tone === 'outlined' && styles.formCardOutlined]}>
      {children}
    </View>
  );
}

export function ResponsiveFieldRow({
  children,
  compact,
  gap = 'large',
}: ResponsiveFieldRowProps) {
  return (
    <View
      style={[
        styles.fieldRow,
        gap === 'medium' && styles.fieldRowMedium,
        compact && styles.fieldRowCompact,
      ]}
    >
      {children}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  formCardOutlined: {
    borderColor: colors.border,
    borderWidth: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  fieldRowMedium: {
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  fieldRowCompact: {
    flexDirection: 'column',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(24, 35, 75, 0.42)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalDismissArea: { flex: 1 },
  modalSheet: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    maxWidth: 680,
    minHeight: 240,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    width: '100%',
  },
  modalHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  modalTitleRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minWidth: 0,
  },
  modalIcon: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  modalTitle: { color: colors.text, flex: 1, fontSize: 21, fontWeight: '900' },
  modalClose: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  modalForm: { gap: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.xl },
}));
