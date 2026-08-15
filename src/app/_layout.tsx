import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppUpdateNotificationObserver } from '@/features/app-updates/presentation/app-update-notification-observer';
import { AuthProvider } from '@/features/auth/presentation/auth-provider';
import { supabaseAuthService } from '@/features/auth/infrastructure/supabase-auth-service';
import { NativeNotificationObserver } from '@/features/notifications/presentation/native-notification-observer';
import { ThemePreferenceProvider, useThemePreference } from '@/shared/presentation/theme-preference-provider';
import { getColors } from '@/shared/presentation/theme';

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <ThemedApp />
    </ThemePreferenceProvider>
  );
}

function ThemedApp() {
  const { scheme } = useThemePreference();
  const palette = getColors(scheme);

  return (
    <AuthProvider service={supabaseAuthService}>
      <AppUpdateNotificationObserver />
      <NativeNotificationObserver />
      <Stack screenOptions={{ contentStyle: { backgroundColor: palette.background }, headerShown: false }} />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </AuthProvider>
  );
}
