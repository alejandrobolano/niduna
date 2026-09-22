import { describe, expect, it } from 'vitest';

import {
  formatFeedingVolume,
  formatFeedingVolumeInput,
  parseFeedingVolumeInput,
} from './feeding-volume';

describe('feeding volume', () => {
  it('stores milliliter input without conversion', () => {
    expect(parseFeedingVolumeInput('120', 'ml')).toBe(120);
  });

  it('converts US fluid ounces to rounded milliliters', () => {
    expect(parseFeedingVolumeInput('4', 'us_oz')).toBe(118);
    expect(parseFeedingVolumeInput('3,5', 'us_oz')).toBe(104);
  });

  it('formats canonical milliliters in the selected unit', () => {
    expect(formatFeedingVolume(120, 'ml')).toBe('120 ml');
    expect(formatFeedingVolume(120, 'us_oz')).toBe('4,1 oz');
    expect(formatFeedingVolumeInput(120, 'us_oz')).toBe('4,1');
  });

  it('rejects invalid and out-of-range values', () => {
    expect(parseFeedingVolumeInput('0', 'ml')).toBeUndefined();
    expect(parseFeedingVolumeInput('68', 'us_oz')).toBeUndefined();
    expect(parseFeedingVolumeInput('abc', 'us_oz')).toBeUndefined();
  });
});
