import { Clock3, Info } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  isFeedingRhythmEstimatePast,
  type FeedingRhythmEstimate,
} from '@/features/care/domain/feeding-rhythm-estimate';
import {
  hasDiscoveredFeedingRhythm,
  markFeedingRhythmDiscovered,
} from '@/features/care/infrastructure/feeding-rhythm-discovery-storage';
import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface FeedingRhythmInfoProps {
  babyId: string;
  estimate: FeedingRhythmEstimate;
  now: Date;
  userId: string;
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function formatInterval(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

export function FeedingRhythmInfo({
  babyId,
  estimate,
  now,
  userId,
}: FeedingRhythmInfoProps) {
  const [visible, setVisible] = useState(false);
  const [discovered, setDiscovered] = useState(() =>
    hasDiscoveredFeedingRhythm(userId, babyId),
  );

  const open = () => {
    markFeedingRhythmDiscovered(userId, babyId);
    setDiscovered(true);
    setVisible(true);
  };
  const close = () => setVisible(false);
  const rangeLabel = `${formatTime(estimate.rangeStartAt)}–${formatTime(estimate.rangeEndAt)}`;
  const hasPassed = isFeedingRhythmEstimatePast(estimate, now);

  return (
    <>
      <View style={styles.accessory}>
        {!discovered ? <Text style={styles.newLabel}>Nuevo</Text> : null}
        <Pressable
          accessibilityHint="Muestra el ritmo estimado de las tomas"
          accessibilityLabel="Información sobre el ritmo de alimentación"
          accessibilityRole="button"
          onPress={open}
          style={({ pressed }) => [
            styles.infoButton,
            pressed && styles.pressed,
          ]}
        >
          <Info color={colors.coral} size={17} />
        </Pressable>
      </View>

      <ConfirmationModal
        confirmLabel="Entendido"
        description="Calculado con las tomas registradas durante las últimas 24 horas."
        eyebrow="RITMO ESTIMADO"
        icon={<Clock3 color={colors.primaryPressed} size={24} />}
        onCancel={close}
        onConfirm={close}
        showCancel={false}
        title={hasPassed ? 'Podría tocar pronto' : rangeLabel}
        visible={visible}
      >
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Intervalo medio</Text>
            <Text style={styles.detailValue}>{formatInterval(estimate.averageIntervalMinutes)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tomas analizadas</Text>
            <Text style={styles.detailValue}>{estimate.feedingCount}</Text>
          </View>
          {hasPassed ? (
            <Text style={styles.pastRange}>El último rango calculado fue {rangeLabel}.</Text>
          ) : null}
          <Text style={styles.notice}>
            Es una estimación basada en los registros familiares, no una recomendación médica.
          </Text>
        </View>
      </ConfirmationModal>
    </>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  accessory: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  newLabel: {
    backgroundColor: colors.coral,
    borderRadius: radius.pill,
    color: colors.onAccent,
    fontSize: 9,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    textTransform: 'uppercase',
  },
  infoButton: {
    alignItems: 'center',
    backgroundColor: `${colors.coral}1F`,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },
  details: { gap: spacing.sm },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: { color: colors.textMuted, fontSize: 13 },
  detailValue: { color: colors.text, fontSize: 13, fontWeight: '900' },
  pastRange: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  notice: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.md,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
    padding: spacing.md,
  },
}));
