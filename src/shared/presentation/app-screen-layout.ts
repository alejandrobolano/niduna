import type { Edge } from 'react-native-safe-area-context';

import { spacing } from '@/shared/presentation/theme';

export const appScreenSafeAreaEdges = [
  'top',
  'left',
  'right',
] satisfies Edge[];

export const appScreenContentBottomPadding = spacing.xl;
export const floatingActionContentBottomPadding = 72;
