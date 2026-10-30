import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface ResourceFormCardProps extends PropsWithChildren {
  tone?: 'plain' | 'outlined';
}

interface ResponsiveFieldRowProps extends PropsWithChildren {
  compact: boolean;
  gap?: 'medium' | 'large';
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
}));
