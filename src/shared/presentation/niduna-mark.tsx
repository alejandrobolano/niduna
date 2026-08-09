import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, spacing } from '@/shared/presentation/theme';

interface NidunaMarkProps {
  accessibilityLabel?: string;
  size?: number;
}

interface NidunaBrandProps {
  compact?: boolean;
}

export function NidunaMark({
  accessibilityLabel,
  size = 48,
}: NidunaMarkProps) {
  return (
    <Svg
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
      height={size}
      viewBox="0 0 72 64"
      width={size * 1.125}
    >
      <Path
        d="M36 11.5c-5.5-6.8-12.5 1.1-6.2 6.5L36 23l6.2-5c6.3-5.4-.7-13.3-6.2-6.5Z"
        fill={colors.coral}
      />
      <Circle cx="27" cy="29" fill={colors.surface} r="10.5" stroke={colors.text} strokeWidth="2.5" />
      <Circle cx="45" cy="29" fill={colors.surface} r="10.5" stroke={colors.text} strokeWidth="2.5" />
      <Circle cx="24" cy="28" fill={colors.text} r="1.4" />
      <Circle cx="42" cy="28" fill={colors.text} r="1.4" />
      <Path d="M28 33c1.4 1.5 3.2 1.5 4.6 0M46 33c1.4 1.5 3.2 1.5 4.6 0" fill="none" stroke={colors.text} strokeLinecap="round" strokeWidth="1.7" />
      <Path d="M17.5 31.5c-6.2 1.8-10 6.2-9.5 11.7.8 8.7 12.8 14.8 28 14.8s27.2-6.1 28-14.8c.5-5.5-3.3-9.9-9.5-11.7" fill="none" stroke={colors.text} strokeLinecap="round" strokeWidth="2.8" />
      <Path d="M11 40.5c6.2 6.7 14.6 10 25 10s18.8-3.3 25-10M15.5 48c5.5 7.2 12.3 10.8 20.5 10.8S51 55.2 56.5 48" fill="none" stroke={colors.text} strokeLinecap="round" strokeWidth="2.8" />
      <Path d="M21 38c3.7 5.4 8.7 8.1 15 8.1S47.3 43.4 51 38M25 39.5l4.5 7M47 39.5l-4.5 7" fill="none" stroke={colors.text} strokeLinecap="round" strokeWidth="2.3" />
    </Svg>
  );
}

export function NidunaBrand({ compact = false }: NidunaBrandProps) {
  return (
    <View
      accessibilityLabel="Niduna"
      accessibilityRole="text"
      style={[styles.brand, compact && styles.brandCompact]}
    >
      <NidunaMark size={compact ? 36 : 42} />
      {compact ? null : (
        <Text style={styles.wordmark}>Niduna</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  brandCompact: { gap: 0 },
  wordmark: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
});
