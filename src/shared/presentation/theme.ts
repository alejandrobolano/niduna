import {
  Appearance,
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type AppColorScheme = 'light' | 'dark';

const lightColors = {
  background: '#FFF8E8',
  surface: '#FFFCF6',
  surfaceMuted: '#F3ECDE',
  text: '#18234B',
  textMuted: '#505C76',
  primary: '#147A7D',
  primaryPressed: '#0E6265',
  coral: '#B6423D',
  coralPressed: '#963530',
  aqua: '#147A7D',
  aquaSoft: '#DDF7F3',
  butter: '#9A6A00',
  butterSoft: '#FFF1BC',
  peach: '#FFE0D4',
  lavender: '#6F4A99',
  lavenderSoft: '#EEE4FA',
  sky: '#DFF5F6',
  border: '#D8CBB4',
  error: '#A83939',
  errorSoft: '#FCE8E8',
  onAccent: '#FFFFFF',
  white: '#FFFFFF',
} as const;

const darkColors: AppColors = {
  background: '#0F1428',
  surface: '#171E35',
  surfaceMuted: '#232B43',
  text: '#FFF8EC',
  textMuted: '#C2C8D8',
  primary: '#69D8D3',
  primaryPressed: '#8CE5E1',
  coral: '#FF918A',
  coralPressed: '#FFB0AA',
  aqua: '#69D8D3',
  aquaSoft: '#183B3F',
  butter: '#F4CF69',
  butterSoft: '#3B3421',
  peach: '#422A2D',
  lavender: '#C7A7EE',
  lavenderSoft: '#312844',
  sky: '#19343A',
  border: '#3B455F',
  error: '#FF9A9A',
  errorSoft: '#44282F',
  onAccent: '#11172B',
  white: '#FFFFFF',
};

export type AppColors = {
  [Key in keyof typeof lightColors]: string;
};

type NamedStyles<T> = {
  [Property in keyof T]: ViewStyle | TextStyle | ImageStyle;
};

export function resolveColorScheme(scheme = Appearance.getColorScheme()): AppColorScheme {
  return scheme === 'dark' ? 'dark' : 'light';
}

export function getColors(scheme: AppColorScheme = resolveColorScheme()): AppColors {
  return scheme === 'dark' ? darkColors : lightColors;
}

export const colors = new Proxy(lightColors as AppColors, {
  get(_target, property: keyof AppColors) {
    return getColors()[property];
  },
});

export function createThemedStyleSheet<T extends NamedStyles<T>>(
  factory: (palette: AppColors) => T,
): T {
  const styles = {
    dark: StyleSheet.create(factory(darkColors)),
    light: StyleSheet.create(factory(lightColors)),
  };

  return new Proxy(styles.light, {
    get(_target, property) {
      return styles[resolveColorScheme()][property as keyof T];
    },
  });
}

export const illustrationColors = {
  aqua: '#48C9C4',
  coral: '#FF756B',
  butter: '#FFD86B',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;
