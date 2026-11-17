import { describe, expect, it } from 'vitest';

import { shouldShowQuickActionAccess } from './quick-action-visibility';

describe('shouldShowQuickActionAccess', () => {
  it('keeps the floating access hidden while quick actions are visible', () => {
    expect(
      shouldShowQuickActionAccess(
        { height: 80, y: 240 },
        { bottomInset: 20, height: 640, scrollOffset: 0, topInset: 8 },
      ),
    ).toBe(false);
  });

  it('shows the floating access after quick actions leave the viewport', () => {
    expect(
      shouldShowQuickActionAccess(
        { height: 80, y: 240 },
        { bottomInset: 20, height: 640, scrollOffset: 340, topInset: 8 },
      ),
    ).toBe(true);
  });

  it('protects the compact bottom action area without reserving the navigation twice', () => {
    expect(
      shouldShowQuickActionAccess(
        { height: 80, y: 550 },
        { bottomInset: 20, height: 640, scrollOffset: 0, topInset: 8 },
      ),
    ).toBe(true);
  });
});
