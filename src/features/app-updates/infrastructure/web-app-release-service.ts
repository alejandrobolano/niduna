import { parseWebAppRelease } from '../domain/web-app-release';

export type WebAppReleaseFetcher = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export async function loadAvailableWebAppRelease(
  fetcher: WebAppReleaseFetcher = fetch,
): Promise<string | undefined> {
  const response = await fetcher(`/app-version.json?t=${Date.now()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return undefined;
  }

  const release = parseWebAppRelease(await response.json());

  return release?.releaseId;
}
