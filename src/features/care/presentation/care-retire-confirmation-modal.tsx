import { Archive, Clock3 } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

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

  return (
    <ConfirmationModal
      accessibilityLabel="Confirmar retirada de registros"
      confirmLabel={isSingleRecord ? 'Quitar registro' : `Quitar ${recordCount} registros`}
      description={`${isSingleRecord ? 'Dejará' : 'Dejarán'} de aparecer en el relevo de ${babyName}.`}
      eyebrow="CONFIRMAR RETIRADA"
      icon={<Archive color={colors.error} size={24} />}
      isPending={isSubmitting}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title={
        isSingleRecord
          ? '¿Quitar este registro del relevo?'
          : `¿Quitar ${recordCount} registros del relevo?`
      }
      tone="danger"
      visible={recordCount > 0}
    >
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
    </ConfirmationModal>
  );
}

const styles = createThemedStyleSheet((colors) => ({
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
}));
