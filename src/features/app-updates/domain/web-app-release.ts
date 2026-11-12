export interface WebAppRelease {
  releaseId: string;
}

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
