import { describe, expect, it, vi } from 'vitest';

import {
  loadAvailableWebAppRelease,
  type WebAppReleaseFetcher,
} from './web-app-release-service';

describe('loadAvailableWebAppRelease', () => {
  it('loads the uncached release manifest', async () => {
    const fetcher = vi.fn<WebAppReleaseFetcher>().mockResolvedValue(
      new Response(JSON.stringify({ releaseId: 'release-b' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );

    await expect(loadAvailableWebAppRelease(fetcher)).resolves.toBe('release-b');
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringMatching(/^\/app-version\.json\?t=\d+$/),
      { cache: 'no-store' },
    );
  });

  it('ignores unavailable and invalid manifests', async () => {
    const unavailable = vi.fn<WebAppReleaseFetcher>().mockResolvedValue(
      new Response(null, { status: 503 }),
    );
    const invalid = vi.fn<WebAppReleaseFetcher>().mockResolvedValue(
      new Response('{}', {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );

    await expect(loadAvailableWebAppRelease(unavailable)).resolves.toBeUndefined();
    await expect(loadAvailableWebAppRelease(invalid)).resolves.toBeUndefined();
  });
});
