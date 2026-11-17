export interface WebAppRelease {
  releaseId: string;
}

const shortReleaseIdLength = 7;

export function parseWebAppRelease(value: unknown): WebAppRelease | undefined {
  if (!value || typeof value !== 'object' || !('releaseId' in value)) {
    return undefined;
  }

  const releaseId = value.releaseId;

  return typeof releaseId === 'string' && releaseId.trim()
    ? { releaseId }
    : undefined;
}

export function isNewWebAppRelease(
  currentReleaseId: string,
  availableReleaseId: string,
): boolean {
  return currentReleaseId !== availableReleaseId;
}

export function formatWebReleaseDiagnostic(
  environment: string | undefined,
  releaseId: string | undefined,
): string | undefined {
  if (environment !== 'development' || !releaseId) {
    return undefined;
  }

  return `Versión web ${releaseId.slice(0, shortReleaseIdLength)}`;
}
