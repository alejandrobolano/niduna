import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AuthenticatedUser } from '@/features/auth/domain/auth';
import { AuthLoadingScreen } from '@/features/auth/presentation/auth-loading-screen';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { AuthScreen } from '@/features/auth/presentation/auth-screen';
import { supabaseBabyProfileRepository } from '@/features/baby-profile/infrastructure/supabase-baby-profile-repository';
import { SessionBanner } from '@/features/auth/presentation/session-banner';
import { BabyProfileScreen } from '@/features/baby-profile/presentation/baby-profile-screen';
import {
  createCareHistoryCsv,
  createCareHistoryFileName,
} from '@/features/care/application/care-history-csv';
import type { CareEvent } from '@/features/care/domain/care-event';
import { exportCareHistoryFile } from '@/features/care/infrastructure/care-history-file';
import { supabaseCareRepository } from '@/features/care/infrastructure/supabase-care-repository';
import { CareHandoffScreen } from '@/features/care/presentation/care-handoff-screen';
import { supabaseFamilyRepository } from '@/features/family/infrastructure/supabase-family-repository';
import { supabaseFamilyBabyContextRepository } from '@/features/family/infrastructure/supabase-family-baby-context-repository';
import {
  FamilyBabyContextErrorScreen,
  FamilyBabySwitcher,
} from '@/features/family/presentation/family-baby-switcher';
import { FamilyScreen } from '@/features/family/presentation/family-screen';
import { useFamilyBabyContext } from '@/features/family/presentation/use-family-baby-context';
import {
  AppSectionNavigation,
  type AppSection,
} from '@/features/home/presentation/app-section-navigation';
import { expoPushPermissionService } from '@/features/notifications/infrastructure/expo-push-permission-service';
import { supabaseNotificationRepository } from '@/features/notifications/infrastructure/supabase-notification-repository';
import { NotificationSettingsPanel } from '@/features/notifications/presentation/notification-settings-panel';
import { spacing } from '@/shared/presentation/theme';

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
  const sessionBanner = (
    <SessionBanner
      email={user.email}
      settingsContent={
        activeFamily ? (
          <NotificationSettingsPanel
            familyId={activeFamily.id}
            familyName={activeFamily.name}
            permissionService={expoPushPermissionService}
            repository={supabaseNotificationRepository}
            userId={user.id}
          />
        ) : undefined
      }
    />
  );

  if (!activeFamily) {
    return (
      <FamilyScreen
        onContextChanged={(familyId) =>
          context.refresh(familyId ? { familyId } : undefined)
        }
        repository={supabaseFamilyRepository}
        topContent={sessionBanner}
        userId={user.id}
      />
    );
  }

  const topContent = (
    <View style={styles.topContent}>
      <View style={styles.navigationRow}>
        <View style={styles.primaryNavigation}>
          <AppSectionNavigation onChange={changeSection} value={section} />
        </View>
        <FamilyBabySwitcher
          activeBaby={context.activeBaby}
          activeFamily={activeFamily}
          families={context.families}
          isCreatingBaby={isCreatingBaby}
          onAddBaby={addBaby}
          onChangeBaby={changeBaby}
          onChangeFamily={changeFamily}
        />
        {sessionBanner}
      </View>
    </View>
  );
  const canManageBabies =
    activeFamily.role === 'owner' || activeFamily.role === 'admin';
  const activeBabyId = context.activeBaby?.id;

  if (section === 'handoff') {
    return (
      <CareHandoffScreen
        babyId={context.activeBaby?.id}
        canCreateBaby={canManageBabies}
        exportHistory={exportCareHistory}
        key={context.activeBaby?.id ?? `${activeFamily.id}:empty`}
        onOpenBabyProfile={() => setSection('baby')}
        repository={supabaseCareRepository}
        topContent={topContent}
        userId={user.id}
      />
    );
  }

  if (section === 'baby' && !context.activeBaby && !canManageBabies) {
    return (
      <FamilyScreen
        babyGroups={context.families}
        onContextChanged={(familyId) =>
          context.refresh(familyId ? { familyId } : undefined)
        }
        onFollowBaby={context.followBaby}
        onRestoreBaby={context.restoreBaby}
        repository={supabaseFamilyRepository}
        topContent={topContent}
        userId={user.id}
      />
    );
  }

  return section === 'baby' ? (
    <BabyProfileScreen
      babyId={isCreatingBaby ? undefined : context.activeBaby?.id}
      canArchive={canManageBabies}
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
      onContextChanged={(familyId) =>
        context.refresh(familyId ? { familyId } : undefined)
      }
      onFollowBaby={context.followBaby}
      onRestoreBaby={context.restoreBaby}
      repository={supabaseFamilyRepository}
      topContent={topContent}
      userId={user.id}
    />
  );
}

const styles = StyleSheet.create({
  topContent: { gap: spacing.md },
  navigationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  primaryNavigation: { flex: 1, minWidth: 260 },
});
