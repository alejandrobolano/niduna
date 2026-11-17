import { describe, expect, it } from 'vitest';

import {
  formatWebReleaseDiagnostic,
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

  it('shows a short release identifier only in development builds', () => {
    expect(
      formatWebReleaseDiagnostic('development', 'dea43116251be510'),
    ).toBe('Versión web dea4311');
    expect(formatWebReleaseDiagnostic('production', 'dea43116251be510')).toBeUndefined();
    expect(formatWebReleaseDiagnostic('development', undefined)).toBeUndefined();
  });
});
