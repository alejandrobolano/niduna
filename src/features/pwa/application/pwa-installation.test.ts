import { describe, expect, it, vi } from 'vitest';

import { isPwaStandalone } from './pwa-installation';

describe('isPwaStandalone', () => {
  it('recognizes the installed display mode on web', () => {
    const matchDisplayMode = vi.fn(() => ({ matches: true }));

    expect(isPwaStandalone('web', { matchDisplayMode })).toBe(true);
    expect(matchDisplayMode).toHaveBeenCalledWith('(display-mode: standalone)');
  });

  it('recognizes an installed iOS PWA', () => {
    expect(
      isPwaStandalone('web', { navigatorStandalone: true }),
    ).toBe(true);
  });

  it('excludes browser tabs and native applications', () => {
    expect(
      isPwaStandalone('web', {
        matchDisplayMode: () => ({ matches: false }),
        navigatorStandalone: false,
      }),
    ).toBe(false);
    expect(
      isPwaStandalone('ios', { navigatorStandalone: true }),
    ).toBe(false);
  });
});
