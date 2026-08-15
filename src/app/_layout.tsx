import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AppUpdateNotificationObserver } from '@/features/app-updates/presentation/app-update-notification-observer';
import { AuthProvider } from '@/features/auth/presentation/auth-provider';
import { supabaseAuthService } from '@/features/auth/infrastructure/supabase-auth-service';
import { NativeNotificationObserver } from '@/features/notifications/presentation/native-notification-observer';
import { getColors, resolveColorScheme } from '@/shared/presentation/theme';

export default function RootLayout() {
  const scheme = resolveColorScheme(useColorScheme());
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
