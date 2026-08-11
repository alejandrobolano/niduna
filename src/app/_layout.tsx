import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppUpdateNotificationObserver } from '@/features/app-updates/presentation/app-update-notification-observer';
import { AuthProvider } from '@/features/auth/presentation/auth-provider';
import { supabaseAuthService } from '@/features/auth/infrastructure/supabase-auth-service';
import { NativeNotificationObserver } from '@/features/notifications/presentation/native-notification-observer';

export default function RootLayout() {
  return (
    <AuthProvider service={supabaseAuthService}>
      <AppUpdateNotificationObserver />
      <NativeNotificationObserver />
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
