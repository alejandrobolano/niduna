import type { ViewStyle } from 'react-native';

import { spacing } from '@/shared/presentation/theme';

export const resourceScreenContentStyle = {
  alignSelf: 'center',
  gap: spacing.xl,
  maxWidth: 920,
  minWidth: 0,
  padding: spacing.lg,
  width: '100%',
} satisfies ViewStyle;
