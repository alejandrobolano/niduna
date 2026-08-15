import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Rect } from 'react-native-svg';

import { createThemedStyleSheet, spacing } from '@/shared/presentation/theme';

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
      viewBox="0 0 100 100"
      width={size}
    >
      <Rect fill="#DFF5F6" height="100" rx="24" width="100" />
      <Rect fill="#FFD86B" height="40" rx="13" transform="rotate(24 19 68)" width="26" x="6" y="48" />
      <Rect fill="#FFD86B" height="40" rx="13" transform="rotate(-24 81 68)" width="26" x="68" y="48" />
      <Rect fill="#48C9C4" height="72" rx="40" width="64" x="18" y="18" />
      <Ellipse cx="50" cy="72" fill="#DDF7F3" opacity={0.74} rx="16" ry="18" />
      <Rect fill="#FF756B" height="22" rx="5.5" transform="rotate(-24 45.5 24)" width="10" x="47" y="2" />
      <Rect fill="#FF756B" height="20" rx="5" transform="rotate(28 55 23)" width="10" x="49" y="3" />
      <Rect fill="#FF756B" height="7" opacity={0.72} rx="3.5" width="11" x="26" y="60" />
      <Rect fill="#FF756B" height="7" opacity={0.72} rx="3.5" width="11" x="63" y="60" />
      <Rect fill="#18234B" height="13" rx="5" width="10" x="33" y="40" />
      <Rect fill="#18234B" height="13" rx="5" width="10" x="57" y="40" />
      <Circle cx="36" cy="43" fill="#FFFFFF" r="2" />
      <Circle cx="60" cy="43" fill="#FFFFFF" r="2" />
      <Rect fill="#FF756B" height="8" rx="4" transform="rotate(45 49.5 60)" width="11" x="44" y="56" />
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

const styles = createThemedStyleSheet((colors) => ({
  brand: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  brandCompact: { gap: 0 },
  wordmark: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
}));
