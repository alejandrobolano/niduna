import { canOfferAndroidPreview } from '../../app-updates/application/android-preview-availability';

interface AccountSettingsVisibilityInput {
  hasActiveFamily: boolean;
  platform: string;
  userAgent?: string;
}

export interface AccountSettingsVisibility {
  showAndroidUpdates: boolean;
  showNotifications: boolean;
  showPwaInstallation: boolean;
}

export function getAccountSettingsVisibility({
  hasActiveFamily,
  platform,
  userAgent,
}: AccountSettingsVisibilityInput): AccountSettingsVisibility {
  return {
    showAndroidUpdates: canOfferAndroidPreview(platform, userAgent),
    showNotifications: hasActiveFamily,
    showPwaInstallation: platform === 'web',
  };
}
