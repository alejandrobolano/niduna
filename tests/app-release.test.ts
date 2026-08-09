import { describe, expect, it } from 'vitest';

import {
  isNewerBuild,
  isTrustedReleaseUrl,
} from '../src/features/app-updates/domain/app-release';

describe('app release', () => {
  it('detects a newer numeric Android build', () => {
    expect(isNewerBuild('12', '11')).toBe(true);
    expect(isNewerBuild('12', '12')).toBe(false);
    expect(isNewerBuild('11', '12')).toBe(false);
  });

  it('does not claim an update when a build version cannot be compared', () => {
    expect(isNewerBuild('preview', '12')).toBe(false);
    expect(isNewerBuild('12', null)).toBe(false);
  });

  it('only accepts EAS artifact links', () => {
    expect(
      isTrustedReleaseUrl('https://expo.dev/artifacts/eas/example.apk'),
    ).toBe(true);
    expect(
      isTrustedReleaseUrl('https://expo.dev/accounts/example/builds/123'),
    ).toBe(false);
    expect(isTrustedReleaseUrl('https://example.com/update.apk')).toBe(false);
  });
});
