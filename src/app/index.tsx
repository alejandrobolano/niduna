import { type ReactNode, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabaseAppReleaseRepository } from '@/features/app-updates/infrastructure/supabase-app-release-repository';
import { AppUpdatePanel } from '@/features/app-updates/presentation/app-update-panel';
import { supabaseAccountDeletionRepository } from '@/features/account-deletion/infrastructure/supabase-account-deletion-repository';
import { AccountDeletionPanel } from '@/features/account-deletion/presentation/account-deletion-panel';
import type { AuthenticatedUser } from '@/features/auth/domain/auth';
import { AuthLoadingScreen } from '@/features/auth/presentation/auth-loading-screen';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { AuthScreen } from '@/features/auth/presentation/auth-screen';
import { SessionBanner } from '@/features/auth/presentation/session-banner';
import { supabaseBabyProfileRepository } from '@/features/baby-profile/infrastructure/supabase-baby-profile-repository';
import { supabaseBabyPhotoRepository } from '@/features/baby-profile/infrastructure/supabase-baby-photo-repository';
import { BabyProfileScreen } from '@/features/baby-profile/presentation/baby-profile-screen';
import {
  createCareHistoryCsv,
  createCareHistoryFileName,
} from '@/features/care/application/care-history-csv';
import type { CareEvent } from '@/features/care/domain/care-event';
import { exportCareHistoryFile } from '@/features/care/infrastructure/care-history-file';
import { supabaseCareRepository } from '@/features/care/infrastructure/supabase-care-repository';
import { CareHandoffScreen } from '@/features/care/presentation/care-handoff-screen';
import { supabaseFamilyStoryRepository } from '@/features/family-stories/infrastructure/supabase-family-story-repository';
import { FamilyStoriesStrip } from '@/features/family-stories/presentation/family-stories-strip';
import { CareHistoryScreen } from '@/features/care/presentation/care-history-screen';
import { supabaseDataExportRepository } from '@/features/data-export/infrastructure/supabase-data-export-repository';
import { DataExportAction } from '@/features/data-export/presentation/data-export-action';
import { supabaseFamilyAuditRepository } from '@/features/family-activity/infrastructure/supabase-family-audit-repository';
import { FamilyActivityScreen } from '@/features/family-activity/presentation/family-activity-screen';
import { supabaseFamilyBabyContextRepository } from '@/features/family/infrastructure/supabase-family-baby-context-repository';
import { supabaseFamilyRepository } from '@/features/family/infrastructure/supabase-family-repository';
import {
  FamilyBabyContextErrorScreen,
} from '@/features/family/presentation/family-baby-switcher';
import { FamilyScreen } from '@/features/family/presentation/family-screen';
import { useFamilyBabyContext } from '@/features/family/presentation/use-family-baby-context';
import {
  AppSectionNavigation,
  type AppSection,
} from '@/features/home/presentation/app-section-navigation';
import { AppHeader } from '@/features/home/presentation/app-header';
import { pushPermissionService } from '@/features/notifications/infrastructure/push-permission-service';
import { supabaseNotificationRepository } from '@/features/notifications/infrastructure/supabase-notification-repository';
import { NotificationSettingsPanel } from '@/features/notifications/presentation/notification-settings-panel';
import { PwaInstallPanel } from '@/features/pwa/presentation/pwa-install-panel';
import { colors, spacing } from '@/shared/presentation/theme';

async function exportCareHistory(
  events: CareEvent[],
  babyName: string,
): Promise<void> {
  await exportCareHistoryFile({
    content: createCareHistoryCsv(events),
    fileName: createCareHistoryFileName(babyName),
  });
}

export default function IndexRoute() {
  const { session, status } = useAuth();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return <AuthenticatedApp user={session.user} />;
}

function AuthenticatedApp({ user }: { user: AuthenticatedUser }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<AppSection>('handoff');
  const [isCreatingBaby, setIsCreatingBaby] = useState(false);
  const [newBabyFormVersion, setNewBabyFormVersion] = useState(0);
  const context = useFamilyBabyContext(
    supabaseFamilyBabyContextRepository,
    user.id,
  );

  if (context.status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (context.status === 'error') {
    return (
      <FamilyBabyContextErrorScreen
        onRetry={() => void context.refresh()}
      />
    );
  }

  function changeSection(nextSection: AppSection) {
    setSection(nextSection);

    if (nextSection !== 'baby') {
      setIsCreatingBaby(false);
    }
  }

  function addBaby() {
    setIsCreatingBaby(true);
    setNewBabyFormVersion((version) => version + 1);
    setSection('baby');
  }

  function changeFamily(familyId: string) {
    setIsCreatingBaby(false);
    context.changeFamily(familyId);
  }

  function changeBaby(babyId: string) {
    setIsCreatingBaby(false);
    context.changeBaby(babyId);
  }

  const activeFamily = context.activeFamily;
  const canManageBabies =
    activeFamily?.role === 'owner' || activeFamily?.role === 'admin';
  const canRecordCare =
    canManageBabies || activeFamily?.role === 'caregiver';
  const sessionBanner = (
    <SessionBanner
      dangerContent={
        <AccountDeletionPanel
          ownedFamilyNames={context.families
            .filter((family) => family.role === 'owner')
            .map((family) => family.name)}
          repository={supabaseAccountDeletionRepository}
        />
      }
      email={user.email}
      onOpenFamilyActivity={
        canManageBabies ? () => changeSection('activity') : undefined
      }
      settingsContent={
        <View style={styles.accountSettings}>
          <DataExportAction
            description="Perfil, preferencias, familias y aportaciones realizadas por ti."
            label="Descargar mis datos"
            repository={supabaseDataExportRepository}
            scope={{ type: 'personal' }}
          />
          <PwaInstallPanel />
          <AppUpdatePanel repository={supabaseAppReleaseRepository} />
          {activeFamily ? (
            <NotificationSettingsPanel
              familyId={activeFamily.id}
              familyName={activeFamily.name}
              permissionService={pushPermissionService}
              repository={supabaseNotificationRepository}
              userId={user.id}
            />
          ) : null}
        </View>
      }
    />
  );

  if (!activeFamily) {
    return (
      <FamilyScreen
        dataExportRepository={supabaseDataExportRepository}
        onContextChanged={(familyId) =>
          context.refresh(familyId ? { familyId } : undefined)
        }
        repository={supabaseFamilyRepository}
        topContent={sessionBanner}
        userId={user.id}
      />
    );
  }

  const compactNavigation = width < 860;
  const topContent = (
    <AppHeader
      accountContent={sessionBanner}
      activeBaby={context.activeBaby}
      activeFamily={activeFamily}
      compact={compactNavigation}
      families={context.families}
      isCreatingBaby={isCreatingBaby}
      onAddBaby={addBaby}
      onChangeBaby={changeBaby}
      onChangeFamily={changeFamily}
      onChangeSection={changeSection}
      section={section}
    />
  );
  const activeBabyId = context.activeBaby?.id;
  const renderAppScreen = (screen: ReactNode) => (
    <View style={styles.appShell}>
      <View style={styles.appScreen}>{screen}</View>
      {compactNavigation ? (
        <View
          style={[
            styles.bottomNavigation,
            { paddingBottom: insets.bottom },
          ]}
        >
          <AppSectionNavigation
            onChange={changeSection}
            placement="bottom"
            value={section}
          />
        </View>
      ) : null}
    </View>
  );

  if (section === 'handoff') {
    return renderAppScreen(
      <CareHandoffScreen
        babyId={context.activeBaby?.id}
        canCreateBaby={canManageBabies}
        key={context.activeBaby?.id ?? `${activeFamily.id}:empty`}
        onOpenBabyProfile={() => setSection('baby')}
        repository={supabaseCareRepository}
        storiesContent={
          context.activeBaby ? (
            <FamilyStoriesStrip
              babyId={context.activeBaby.id}
              canPublish={canRecordCare}
              key={context.activeBaby.id}
              repository={supabaseFamilyStoryRepository}
              userId={user.id}
            />
          ) : undefined
        }
        topContent={topContent}
        userId={user.id}
      />,
    );
  }

  if (section === 'history') {
    return renderAppScreen(
      <CareHistoryScreen
        babyId={context.activeBaby?.id}
        babyName={context.activeBaby?.name}
        canManage={canManageBabies}
        canRecord={canRecordCare}
        exportHistory={exportCareHistory}
        key={context.activeBaby?.id ?? `${activeFamily.id}:history-empty`}
        repository={supabaseCareRepository}
        topContent={topContent}
        userId={user.id}
      />,
    );
  }

  if (section === 'activity' && canManageBabies) {
    return renderAppScreen(
      <FamilyActivityScreen
        familyId={activeFamily.id}
        familyName={activeFamily.name}
        repository={supabaseFamilyAuditRepository}
        topContent={topContent}
      />,
    );
  }

  if (section === 'baby' && !context.activeBaby && !canManageBabies) {
    return renderAppScreen(
      <FamilyScreen
        babyGroups={context.families}
        dataExportRepository={supabaseDataExportRepository}
        onContextChanged={(familyId) =>
          context.refresh(familyId ? { familyId } : undefined)
        }
        onFollowBaby={context.followBaby}
        onRestoreBaby={context.restoreBaby}
        repository={supabaseFamilyRepository}
        topContent={topContent}
        userId={user.id}
      />,
    );
  }

  return renderAppScreen(
    section === 'baby' ? (
      <BabyProfileScreen
        babyId={isCreatingBaby ? undefined : context.activeBaby?.id}
        babyPhotoRepository={supabaseBabyPhotoRepository}
        canManageBabies={canManageBabies}
        familyId={activeFamily.id}
        key={`${activeFamily.id}:${
          isCreatingBaby
            ? `new-${newBabyFormVersion}`
            : (context.activeBaby?.id ?? 'new')
        }`}
        onSaved={(babyId) => {
          void context
            .refresh({ babyId, familyId: activeFamily.id })
            .then(() => setIsCreatingBaby(false));
        }}
        onArchive={activeBabyId ? () => context.archiveBaby(activeBabyId) : undefined}
        onUnfollow={activeBabyId ? () => context.unfollowBaby(activeBabyId) : undefined}
        repository={supabaseBabyProfileRepository}
        topContent={topContent}
      />
    ) : (
      <FamilyScreen
        babyGroups={context.families}
        dataExportRepository={supabaseDataExportRepository}
        onContextChanged={(familyId) =>
          context.refresh(familyId ? { familyId } : undefined)
        }
        onFollowBaby={context.followBaby}
        onRestoreBaby={context.restoreBaby}
        repository={supabaseFamilyRepository}
        topContent={topContent}
        userId={user.id}
      />
    ),
  );
}

const styles = StyleSheet.create({
  accountSettings: { gap: spacing.lg },
  appShell: { flex: 1 },
  appScreen: { flex: 1 },
  bottomNavigation: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 2,
  },
});
