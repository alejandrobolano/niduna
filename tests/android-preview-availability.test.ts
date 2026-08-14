import { describe, expect, it } from 'vitest';

import { canOfferAndroidPreview } from '../src/features/app-updates/application/android-preview-availability';

describe('Android preview availability', () => {
  it('offers previews to the native Android app', () => {
    expect(canOfferAndroidPreview('android')).toBe(true);
  });

  it('offers previews in Android browsers', () => {
    expect(
      canOfferAndroidPreview(
        'web',
        'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36',
      ),
    ).toBe(true);
  });

  it('does not offer Android previews to desktop or Apple browsers', () => {
    expect(
      canOfferAndroidPreview(
        'web',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
      ),
    ).toBe(false);
    expect(
      canOfferAndroidPreview(
        'web',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      ),
    ).toBe(false);
    expect(canOfferAndroidPreview('ios')).toBe(false);
  });
});
