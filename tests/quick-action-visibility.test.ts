import { describe, expect, it } from 'vitest';

import { shouldShowQuickActionAccess } from '../src/features/care/presentation/quick-action-visibility';

const layout = { height: 180, y: 260 };

describe('quick action visibility', () => {
  it('keeps the shortcut hidden while the full action block is visible', () => {
    expect(
      shouldShowQuickActionAccess(layout, {
        bottomInset: 16,
        height: 520,
        scrollOffset: 0,
        topInset: 8,
      }),
    ).toBe(false);
  });

  it('shows the shortcut while part of the action block is clipped', () => {
    expect(
      shouldShowQuickActionAccess(layout, {
        bottomInset: 16,
        height: 420,
        scrollOffset: 0,
        topInset: 8,
      }),
    ).toBe(true);
  });

  it('shows the shortcut while the action block is below the viewport', () => {
    expect(
      shouldShowQuickActionAccess(
        { height: 180, y: 500 },
        {
          bottomInset: 16,
          height: 420,
          scrollOffset: 0,
          topInset: 8,
        },
      ),
    ).toBe(true);
  });

  it('shows the shortcut after the user scrolls beyond the action block', () => {
    expect(
      shouldShowQuickActionAccess(layout, {
        bottomInset: 16,
        height: 520,
        scrollOffset: 450,
        topInset: 8,
      }),
    ).toBe(true);
  });
});
