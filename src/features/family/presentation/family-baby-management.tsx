import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { FamilyBabyGroup } from '@/features/family/domain/family-baby-context';
import { createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface FamilyBabyManagementProps {
  family: FamilyBabyGroup;
  onFollowBaby: (babyId: string) => Promise<void>;
  onRestoreBaby: (babyId: string) => Promise<void>;
}

export function FamilyBabyManagement({
  family,
  onFollowBaby,
  onRestoreBaby,
}: FamilyBabyManagementProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (
    family.unfollowedBabies.length === 0 &&
    family.archivedBabies.length === 0
  ) {
    return null;
  }

  async function run(action: () => Promise<void>) {
    setIsWorking(true);
    setHasError(false);

    try {
      await action();
    } catch {
      setHasError(true);
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>Gestión de bebés</Text>
        <Text style={styles.subtitle}>
          Seguimientos personales y perfiles retirados de esta familia.
        </Text>
      </View>
      {family.unfollowedBabies.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Bebés que no sigues</Text>
          {family.unfollowedBabies.map((baby) => (
            <Pressable
              accessibilityRole="link"
              disabled={isWorking}
              key={baby.id}
              onPress={() => void run(() => onFollowBaby(baby.id))}
            >
              <Text style={styles.link}>Volver a seguir a {baby.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {family.archivedBabies.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Retirados de la familia</Text>
          {family.archivedBabies.map((baby) => (
            <Pressable
              accessibilityRole="link"
              disabled={isWorking}
              key={baby.id}
              onPress={() => void run(() => onRestoreBaby(baby.id))}
            >
              <Text style={styles.link}>Restaurar a {baby.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {hasError ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          No pudimos actualizar el seguimiento. Inténtalo de nuevo.
        </Text>
      ) : null}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  heading: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  group: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  groupTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  link: {
    color: colors.primaryPressed,
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: spacing.xs,
  },
  error: { color: colors.error, fontSize: 12 },
}));
