import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ScreenHero } from '@/shared/presentation/screen-hero';
import { createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface ResourceScreenHeroProps {
  eyebrow: string;
  icon: ReactNode;
  onBack: () => void;
  subtitle: string;
  title: string;
}

export function ResourceScreenHero({
  eyebrow,
  icon,
  onBack,
  subtitle,
  title,
}: ResourceScreenHeroProps) {
  return (
    <ScreenHero
      compactStack
      eyebrow={eyebrow}
      leading={<View style={styles.icon}>{icon}</View>}
      mascot={false}
      subtitle={subtitle}
      title={title}
      trailing={
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Volver al bebé</Text>
        </Pressable>
      }
    />
  );
}

const styles = createThemedStyleSheet((colors) => ({
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButtonText: { color: colors.primaryPressed, fontSize: 13, fontWeight: '900' },
}));
