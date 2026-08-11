import { describe, expect, it, vi } from 'vitest';

import { isPwaStandalone } from '../src/features/pwa/application/pwa-installation';

describe('PWA installation state', () => {
  it('does not call browser APIs on native platforms', () => {
    const matchDisplayMode = vi.fn();

    expect(isPwaStandalone('android', { matchDisplayMode })).toBe(false);
    expect(matchDisplayMode).not.toHaveBeenCalled();
  });

  it('detects the installed display mode on web', () => {
    const matchDisplayMode = vi.fn(() => ({ matches: true }));

    expect(isPwaStandalone('web', { matchDisplayMode })).toBe(true);
    expect(matchDisplayMode).toHaveBeenCalledWith(
      '(display-mode: standalone)',
    );
  });

  it('supports the standalone navigator flag on web', () => {
    expect(
      isPwaStandalone('web', { navigatorStandalone: true }),
    ).toBe(true);
  });
});
