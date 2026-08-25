import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Platform, View } from 'react-native';

import { supabaseAccountDeletionRepository } from '@/features/account-deletion/infrastructure/supabase-account-deletion-repository';
import { AccountDeletionPanel } from '@/features/account-deletion/presentation/account-deletion-panel';
import { supabaseAppReleaseRepository } from '@/features/app-updates/infrastructure/supabase-app-release-repository';
import { AppUpdatePanel } from '@/features/app-updates/presentation/app-update-panel';
import { getAccountSettingsVisibility } from '@/features/auth/application/account-settings-visibility';
import { AuthLoadingScreen } from '@/features/auth/presentation/auth-loading-screen';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { AuthScreen } from '@/features/auth/presentation/auth-screen';
import { AccountSettingsScreen } from '@/features/auth/presentation/account-settings-screen';
import { supabaseDataExportRepository } from '@/features/data-export/infrastructure/supabase-data-export-repository';
import { DataExportAction } from '@/features/data-export/presentation/data-export-action';
import { supabaseFamilyBabyContextRepository } from '@/features/family/infrastructure/supabase-family-baby-context-repository';
import { FamilyBabyContextErrorScreen } from '@/features/family/presentation/family-baby-switcher';
import { useFamilyBabyContext } from '@/features/family/presentation/use-family-baby-context';
import { pushPermissionService } from '@/features/notifications/infrastructure/push-permission-service';
import { supabaseNotificationRepository } from '@/features/notifications/infrastructure/supabase-notification-repository';
import { NotificationSettingsPanel } from '@/features/notifications/presentation/notification-settings-panel';
import { requestGuidedOnboardingReplay } from '@/features/onboarding/infrastructure/guided-onboarding-storage';
import { PwaInstallPanel } from '@/features/pwa/presentation/pwa-install-panel';
import { createThemedStyleSheet, spacing } from '@/shared/presentation/theme';
import { ThemePreferenceControl } from '@/shared/presentation/theme-preference-control';

export default function SettingsRoute() {
  const { session, status } = useAuth();
  const router = useRouter();
  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }, [router]);

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <AuthenticatedSettings
      email={session.user.email}
      onBack={goBack}
      onOpenHelp={() => router.push('/help')}
      onReplayOnboarding={() => {
        requestGuidedOnboardingReplay(session.user.id);
        router.replace('/');
      }}
      userId={session.user.id}
    />
  );
}

function AuthenticatedSettings({
  email,
  onBack,
  onOpenHelp,
  onReplayOnboarding,
  userId,
}: {
  email: string;
  onBack: () => void;
  onOpenHelp: () => void;
  onReplayOnboarding: () => void;
  userId: string;
}) {
  const context = useFamilyBabyContext(
    supabaseFamilyBabyContextRepository,
    userId,
  );

  if (context.status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (context.status === 'error') {
    return <FamilyBabyContextErrorScreen onRetry={() => void context.refresh()} />;
  }

  const activeFamily = context.activeFamily;
  const userAgent =
    Platform.OS === 'web' && typeof navigator !== 'undefined'
      ? navigator.userAgent
      : undefined;
  const visibility = getAccountSettingsVisibility({
    hasActiveFamily: Boolean(activeFamily),
    platform: Platform.OS,
    userAgent,
  });
  const deviceContent =
    visibility.showPwaInstallation || visibility.showAndroidUpdates ? (
      <View style={styles.deviceContent}>
        {visibility.showPwaInstallation ? <PwaInstallPanel /> : null}
        {visibility.showAndroidUpdates ? (
          <AppUpdatePanel repository={supabaseAppReleaseRepository} />
        ) : null}
      </View>
    ) : undefined;

  return (
    <AccountSettingsScreen
      appearanceContent={<ThemePreferenceControl />}
      dangerContent={
        <AccountDeletionPanel
          ownedFamilyNames={context.families
            .filter((family) => family.role === 'owner')
            .map((family) => family.name)}
          repository={supabaseAccountDeletionRepository}
        />
      }
      dataContent={
        <DataExportAction
          description="Perfil, preferencias, familias y aportaciones realizadas por ti."
          label="Descargar mis datos"
          repository={supabaseDataExportRepository}
          scope={{ type: 'personal' }}
        />
      }
      deviceContent={deviceContent}
      email={email}
      notificationContent={
        activeFamily && visibility.showNotifications ? (
          <NotificationSettingsPanel
            familyId={activeFamily.id}
            familyName={activeFamily.name}
            permissionService={pushPermissionService}
            repository={supabaseNotificationRepository}
            userId={userId}
          />
        ) : undefined
      }
      onBack={onBack}
      onOpenHelp={onOpenHelp}
      onReplayOnboarding={onReplayOnboarding}
    />
  );
}

const styles = createThemedStyleSheet(() => ({
  deviceContent: { gap: spacing.lg },
}));
