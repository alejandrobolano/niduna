import Constants from 'expo-constants';

import { formatWebReleaseDiagnostic } from '@/features/app-updates/domain/web-app-release';

export const currentWebAppReleaseId =
  process.env.EXPO_PUBLIC_WEB_RELEASE_ID ?? Constants.expoConfig?.version;

export const webAppReleaseDiagnostic = formatWebReleaseDiagnostic(
  process.env.EXPO_PUBLIC_WEB_ENV,
  process.env.EXPO_PUBLIC_WEB_RELEASE_ID,
);
