export interface AppRelease {
  appBuildVersion: string;
  appVersion: string;
  artifactUrl: string;
  buildDetailsUrl: string;
  completedAt: string;
  id: string;
  platform: 'android' | 'ios';
}

function parseBuildVersion(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }

  const version = Number(value);

  return Number.isSafeInteger(version) ? version : undefined;
}

export function isNewerBuild(
  releaseBuildVersion: string,
  installedBuildVersion: string | null,
): boolean {
  const releaseVersion = parseBuildVersion(releaseBuildVersion);
  const installedVersion = parseBuildVersion(installedBuildVersion);

  return (
    releaseVersion !== undefined &&
    installedVersion !== undefined &&
    releaseVersion > installedVersion
  );
}

export function isTrustedReleaseUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' &&
      url.hostname === 'expo.dev' &&
      url.pathname.startsWith('/artifacts/eas/')
    );
  } catch {
    return false;
  }
}
