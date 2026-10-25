import { describe, expect, it } from 'vitest';

import { isVersionAtLeast } from './product-announcement';

describe('isVersionAtLeast', () => {
  it('accepts equal and newer versions', () => {
    expect(isVersionAtLeast('1.15.0', '1.15.0')).toBe(true);
    expect(isVersionAtLeast('1.16.0', '1.15.0')).toBe(true);
  });

  it('rejects older versions', () => {
    expect(isVersionAtLeast('1.14.2', '1.15.0')).toBe(false);
  });
});
