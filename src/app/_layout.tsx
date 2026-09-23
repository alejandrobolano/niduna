import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '@/global.css';

import { AppUpdateNotificationObserver } from '@/features/app-updates/presentation/app-update-notification-observer';
import { AuthProvider, useAuth } from '@/features/auth/presentation/auth-provider';
import { supabaseAuthService } from '@/features/auth/infrastructure/supabase-auth-service';
import { supabaseFeedingVolumePreferenceRepository } from '@/features/care/infrastructure/supabase-feeding-volume-preference-repository';
import { FeedingVolumePreferenceProvider } from '@/features/care/presentation/feeding-volume-preference-provider';
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
      <AuthenticatedApp palette={palette} scheme={scheme} />
    </AuthProvider>
  );
}

function AuthenticatedApp({ palette, scheme }: { palette: ReturnType<typeof getColors>; scheme: 'light' | 'dark' }) {
  const { session } = useAuth();
  return (
    <FeedingVolumePreferenceProvider
      key={session?.user.id ?? 'anonymous'}
      repository={supabaseFeedingVolumePreferenceRepository}
      userId={session?.user.id}
    >
      <AppUpdateNotificationObserver />
      <NativeNotificationObserver />
      <Stack screenOptions={{ contentStyle: { backgroundColor: palette.background }, headerShown: false }} />
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </FeedingVolumePreferenceProvider>
  );
}
