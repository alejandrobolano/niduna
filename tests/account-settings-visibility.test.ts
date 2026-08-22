import { describe, expect, it } from 'vitest';

import { getAccountSettingsVisibility } from '../src/features/auth/application/account-settings-visibility';

describe('account settings visibility', () => {
  it('shows family notifications only with an active family', () => {
    expect(
      getAccountSettingsVisibility({
        hasActiveFamily: true,
        platform: 'ios',
      }).showNotifications,
    ).toBe(true);
    expect(
      getAccountSettingsVisibility({
        hasActiveFamily: false,
        platform: 'ios',
      }).showNotifications,
    ).toBe(false);
  });

  it('shows PWA installation only on the web', () => {
    expect(
      getAccountSettingsVisibility({
        hasActiveFamily: true,
        platform: 'web',
      }).showPwaInstallation,
    ).toBe(true);
    expect(
      getAccountSettingsVisibility({
        hasActiveFamily: true,
        platform: 'android',
      }).showPwaInstallation,
    ).toBe(false);
  });

  it('shows Android previews only in Android contexts', () => {
    expect(
      getAccountSettingsVisibility({
        hasActiveFamily: true,
        platform: 'android',
      }).showAndroidUpdates,
    ).toBe(true);
    expect(
      getAccountSettingsVisibility({
        hasActiveFamily: true,
        platform: 'web',
        userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)',
      }).showAndroidUpdates,
    ).toBe(true);
    expect(
      getAccountSettingsVisibility({
        hasActiveFamily: true,
        platform: 'ios',
      }).showAndroidUpdates,
    ).toBe(false);
  });
});
