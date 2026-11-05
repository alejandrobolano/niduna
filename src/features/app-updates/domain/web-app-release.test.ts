import { describe, expect, it } from 'vitest';

import {
  isNewWebAppRelease,
  parseWebAppRelease,
} from './web-app-release';

describe('web app releases', () => {
  it('parses a valid release manifest', () => {
    expect(parseWebAppRelease({ releaseId: 'commit-sha' })).toEqual({
      releaseId: 'commit-sha',
    });
  });

  it.each([undefined, null, {}, { releaseId: '' }, { releaseId: 17 }])(
    'rejects an invalid release manifest',
    (value) => {
      expect(parseWebAppRelease(value)).toBeUndefined();
    },
  );

  it('detects when another release is available', () => {
    expect(isNewWebAppRelease('release-a', 'release-b')).toBe(true);
    expect(isNewWebAppRelease('release-a', 'release-a')).toBe(false);
  });
});
