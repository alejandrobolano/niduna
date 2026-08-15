import { describe, expect, it, vi } from 'vitest';

import { getColors, type AppColors, type AppColorScheme } from '../src/shared/presentation/theme';

vi.mock('react-native', () => ({
  Appearance: { getColorScheme: () => 'light' },
  StyleSheet: { create: <T>(styles: T) => styles },
}));

function channelToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const channels = hex.match(/[0-9a-f]{2}/gi);

  if (!channels || channels.length !== 3) {
    throw new Error(`Unsupported color: ${hex}`);
  }

  const [red, green, blue] = channels.map((channel) => channelToLinear(Number.parseInt(channel, 16)));
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function expectReadable(
  colors: AppColors,
  foreground: keyof AppColors,
  background: keyof AppColors,
): void {
  expect(
    contrastRatio(colors[foreground], colors[background]),
    `${String(foreground)} on ${String(background)}`,
  ).toBeGreaterThanOrEqual(4.5);
}

describe.each<AppColorScheme>(['light', 'dark'])('%s theme contrast', (scheme) => {
  const colors = getColors(scheme);

  it('keeps primary and secondary copy readable on page surfaces', () => {
    expectReadable(colors, 'text', 'background');
    expectReadable(colors, 'text', 'surface');
    expectReadable(colors, 'textMuted', 'background');
    expectReadable(colors, 'textMuted', 'surface');
  });

  it('keeps action labels readable on accent colors', () => {
    expectReadable(colors, 'onAccent', 'primary');
    expectReadable(colors, 'onAccent', 'primaryPressed');
    expectReadable(colors, 'onAccent', 'coral');
    expectReadable(colors, 'onAccent', 'coralPressed');
  });

  it('keeps semantic feedback readable', () => {
    expectReadable(colors, 'error', 'errorSoft');
    expectReadable(colors, 'primaryPressed', 'aquaSoft');
    expectReadable(colors, 'lavender', 'lavenderSoft');
  });
});
