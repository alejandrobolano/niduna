import type { ReactNode } from 'react';
import { Platform, Text, useWindowDimensions, View } from 'react-native';

import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import {
  colors,
  createThemedStyleSheet,
  radius,
  spacing,
  type AppColors,
} from '@/shared/presentation/theme';

type ScreenHeroTone = 'family' | 'primary';

interface ScreenHeroProps {
  children?: ReactNode;
  compactStack?: boolean;
  eyebrow: string;
  leading?: ReactNode;
  mascot?: boolean;
  subtitle: string;
  title: string;
  tone?: ScreenHeroTone;
  trailing?: ReactNode;
}

const backgroundByTone: Record<ScreenHeroTone, keyof AppColors> = {
  family: 'lavenderSoft',
  primary: 'sky',
};

const accentByTone: Record<ScreenHeroTone, keyof AppColors> = {
  family: 'lavender',
  primary: 'primaryPressed',
};

export function ScreenHero({
  children,
  compactStack = false,
  eyebrow,
  leading,
  mascot = true,
  subtitle,
  title,
  tone = 'primary',
  trailing,
}: ScreenHeroProps) {
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const useWebCompactLayout = Platform.OS === 'web' && compact && compactStack;

  if (useWebCompactLayout) {
    return (
      <View
        style={[
          styles.hero,
          styles.heroCompact,
          styles.heroCompactStack,
          { backgroundColor: colors[backgroundByTone[tone]] },
        ]}
      >
        <View style={styles.compactHeading}>
          {leading ? <View style={styles.compactLeading}>{leading}</View> : null}
          <View style={styles.compactTitleGroup}>
            <Text
              style={[
                styles.eyebrow,
                { color: colors[accentByTone[tone]] },
              ]}
            >
              {eyebrow}
            </Text>
            <Text style={[styles.title, styles.titleCompact]}>{title}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
        {trailing ? <View style={styles.compactTrailing}>{trailing}</View> : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.hero,
        { backgroundColor: colors[backgroundByTone[tone]] },
        compact && styles.heroCompact,
        compact && compactStack && styles.heroCompactStack,
      ]}
    >
      {leading}
      <View style={[styles.copy, compact && compactStack && styles.copyStack]}>
        <Text
          style={[
            styles.eyebrow,
            { color: colors[accentByTone[tone]] },
          ]}
        >
          {eyebrow}
        </Text>
        <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children}
      </View>
      {mascot ? <NuniMascot size={compact ? 82 : 116} /> : null}
      {trailing}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  copy: { flex: 1, gap: spacing.sm, zIndex: 1 },
  copyStack: { alignSelf: 'stretch', flex: 0 },
  compactHeading: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: spacing.md,
  },
  compactLeading: { flexShrink: 0 },
  compactTitleGroup: { flex: 1, gap: spacing.xs, minWidth: 0 },
  compactTrailing: { alignSelf: 'stretch', marginTop: spacing.xs },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  hero: {
    alignItems: 'center',
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 160,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  heroCompact: { minHeight: 140, padding: spacing.lg },
  heroCompactStack: { alignItems: 'flex-start', flexDirection: 'column' },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 600,
  },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  titleCompact: { fontSize: 24, lineHeight: 29 },
}));
