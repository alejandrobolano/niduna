import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AuthenticatedUser } from '@/features/auth/domain/auth';
import { AuthLoadingScreen } from '@/features/auth/presentation/auth-loading-screen';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { AuthScreen } from '@/features/auth/presentation/auth-screen';
import { SessionBanner } from '@/features/auth/presentation/session-banner';
import { supabaseBabyProfileRepository } from '@/features/baby-profile/infrastructure/supabase-baby-profile-repository';
import { supabaseBabyPhotoRepository } from '@/features/baby-profile/infrastructure/supabase-baby-photo-repository';
import { supabaseBabyAvatarRepository } from '@/features/avatars/infrastructure/supabase-baby-avatar-repository';
import { BabyProfileScreen } from '@/features/baby-profile/presentation/baby-profile-screen';
import { supabaseBabyDocumentRepository } from '@/features/baby-documents/infrastructure/supabase-baby-document-repository';
import { BabyDocumentsScreen } from '@/features/baby-documents/presentation/baby-documents-screen';
import { supabaseBabyContactRepository } from '@/features/baby-contacts/infrastructure/supabase-baby-contact-repository';
import { BabyContactsScreen } from '@/features/baby-contacts/presentation/baby-contacts-screen';
import { supabaseCareSummaryRepository } from '@/features/care-summary/infrastructure/supabase-care-summary-repository';
import { DailyCareSummaryScreen } from '@/features/care-summary/presentation/daily-care-summary-screen';
import {
  createCareHistoryCsv,
  createCareHistoryFileName,
} from '@/features/care/application/care-history-csv';
import {
  createCareReportFileName,
  createCareReportHtml,
  type CareReportInput,
} from '@/features/care/application/care-report';
import type { CareEvent } from '@/features/care/domain/care-event';
import { exportCareHistoryFile } from '@/features/care/infrastructure/care-history-file';
import { exportCareReportFile } from '@/features/care/infrastructure/care-report-file';
import { supabaseCareRepository } from '@/features/care/infrastructure/supabase-care-repository';
import { CareHandoffScreen } from '@/features/care/presentation/care-handoff-screen';
import {
  createCareWidgetActionRequest,
  parseCareWidgetAction,
  type CareWidgetAction,
} from '@/features/care-widget/domain/care-widget-action';
import { CareQuickActions } from '@/features/care-widget/presentation/care-quick-actions';
import { CareWidgetSynchronizer } from '@/features/care-widget/presentation/care-widget-synchronizer';
import { supabaseFamilyStoryRepository } from '@/features/family-stories/infrastructure/supabase-family-story-repository';
import { FamilyStoriesStrip } from '@/features/family-stories/presentation/family-stories-strip';
import { CareHistoryScreen } from '@/features/care/presentation/care-history-screen';
import { supabaseDataExportRepository } from '@/features/data-export/infrastructure/supabase-data-export-repository';
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
  canAccessCare,
  resolveAccessibleAppSection,
} from '@/features/home/domain/app-section-access';
import type { AppSection } from '@/features/home/domain/app-section';
import {
  AppSectionNavigation,
  bottomNavigationContentHeight,
} from '@/features/home/presentation/app-section-navigation';
import { AppHeader } from '@/features/home/presentation/app-header';
import { pushPermissionService } from '@/features/notifications/infrastructure/push-permission-service';
import { supabaseNotificationRepository } from '@/features/notifications/infrastructure/supabase-notification-repository';
import { NotificationOptInModal } from '@/features/notifications/presentation/notification-opt-in-modal';
import {
  getGuidedOnboardingCompletion,
  getGuidedOnboardingDismissal,
  getGuidedOnboardingSteps,
  shouldStartGuidedOnboarding,
  type GuidedOnboardingState,
  type GuidedOnboardingStep,
} from '@/features/onboarding/domain/guided-onboarding';
import {
  consumeGuidedOnboardingReplay,
  loadGuidedOnboardingState,
  saveGuidedOnboardingState,
} from '@/features/onboarding/infrastructure/guided-onboarding-storage';
import { GuidedOnboardingOverlay } from '@/features/onboarding/presentation/guided-onboarding-overlay';
import {
  createThemedStyleSheet,
  getColors,
  type AppColorScheme,
} from '@/shared/presentation/theme';
import { useThemePreference } from '@/shared/presentation/theme-preference-provider';

async function exportCareHistory(
  events: CareEvent[],
  babyName: string,
): Promise<void> {
  await exportCareHistoryFile({
    content: createCareHistoryCsv(events),
    fileName: createCareHistoryFileName(babyName),
  });
}

async function exportCareReport(input: CareReportInput): Promise<void> {
  await exportCareReportFile({
    fileName: createCareReportFileName(input.babyName),
    html: createCareReportHtml(input),
  });
}

function ignoreCareQuickAction(_: CareWidgetAction): void {}
function ignoreOpenHandoff(): void {}

export default function IndexRoute() {
  const { session, status } = useAuth();
  const { scheme } = useThemePreference();
  const params = useLocalSearchParams<{
    careAction?: string;
    createBaby?: string;
    section?: string;
  }>();
  const initialCareAction = parseCareWidgetAction(params.careAction);

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return (
      <>
        <CareQuickActions
          enabled={false}
          onAction={ignoreCareQuickAction}
          onOpenHandoff={ignoreOpenHandoff}
        />
        <CareWidgetSynchronizer
          enabled={false}
          repository={supabaseCareRepository}
          userId=""
        />
        <AuthScreen />
      </>
    );
  }

  return (
    <AuthenticatedApp
      colorScheme={scheme}
      initialCareAction={initialCareAction}
      initialCreateBaby={params.createBaby === '1'}
      initialSection={
        initialCareAction ? 'handoff' : resolveInitialSection(params.section)
      }
      key={session.user.id}
      user={session.user}
    />
  );
}

function AuthenticatedApp({
  colorScheme,
  initialCareAction,
  initialCreateBaby,
  initialSection,
  user,
}: {
  colorScheme: AppColorScheme;
  initialCareAction?: CareWidgetAction;
  initialCreateBaby: boolean;
  initialSection: AppSection;
  user: AuthenticatedUser;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [section, setSection] = useState<AppSection>(initialSection);
  const [pendingCareAction, setPendingCareAction] = useState(() =>
    initialCareAction
      ? createCareWidgetActionRequest(initialCareAction)
      : undefined,
  );
  const [isCreatingBaby, setIsCreatingBaby] = useState(initialCreateBaby);
  const [newBabyFormVersion, setNewBabyFormVersion] = useState(0);
  const [onboardingState, setOnboardingState] = useState<
    GuidedOnboardingState | undefined
  >(() => loadGuidedOnboardingState(user.id));
  const [onboardingSessionFinished, setOnboardingSessionFinished] =
    useState(false);
  const [notificationPresentation, setNotificationPresentation] = useState<
    'onboarding' | 'scheduled'
  >('scheduled');
  const [suppressScheduledNotifications, setSuppressScheduledNotifications] =
    useState(false);
  const [replayRequested, setReplayRequested] = useState(() =>
    consumeGuidedOnboardingReplay(user.id),
  );
  const hasCompletedInitialFocus = useRef(false);
  const context = useFamilyBabyContext(
    supabaseFamilyBabyContextRepository,
    user.id,
  );
  const refreshFamilyBabyContext = context.refresh;

  useFocusEffect(
    useCallback(() => {
      if (!hasCompletedInitialFocus.current) {
        hasCompletedInitialFocus.current = true;
        return;
      }

      void refreshFamilyBabyContext();
    }, [refreshFamilyBabyContext]),
  );

  const hasActiveFamily = Boolean(context.activeFamily);
  const activeBabyLifeStage = context.activeBaby?.lifeStage;
  const careAvailable = canAccessCare(activeBabyLifeStage);
  const onboardingSteps = useMemo(
    () =>
      getGuidedOnboardingSteps({
        careAvailable,
        hasActiveBaby: Boolean(context.activeBaby),
        hasActiveFamily,
      }),
    [careAvailable, context.activeBaby, hasActiveFamily],
  );
  const onboardingShouldStart =
    context.status === 'ready' &&
    (replayRequested ||
      shouldStartGuidedOnboarding(onboardingState, hasActiveFamily));
  const isOnboardingVisible =
    onboardingShouldStart && !onboardingSessionFinished;

  const navigateToSection = useCallback(
    (nextSection: AppSection, createBaby = false) => {
      const accessibleSection = resolveAccessibleAppSection(
        nextSection,
        activeBabyLifeStage,
      );
      setSection(accessibleSection);
      setIsCreatingBaby(createBaby);
      router.setParams({
        createBaby: createBaby ? '1' : undefined,
        section: accessibleSection,
      });
    },
    [activeBabyLifeStage, router],
  );

  const showOnboardingStep = useCallback(
    (step: GuidedOnboardingStep) => {
      if (step.section) {
        navigateToSection(step.section);
      }
    },
    [navigateToSection],
  );

  const handleCareQuickAction = useCallback(
    (action: CareWidgetAction) => {
      setPendingCareAction(createCareWidgetActionRequest(action));
      navigateToSection('handoff');
    },
    [navigateToSection],
  );

  const openCareHandoff = useCallback(() => {
    navigateToSection('handoff');
  }, [navigateToSection]);

  const clearPendingCareAction = useCallback(() => {
    setPendingCareAction(undefined);
    router.setParams({ careAction: undefined });
  }, [router]);

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
    navigateToSection(nextSection);
  }

  function saveOnboardingResult(nextState: GuidedOnboardingState) {
    if (!replayRequested || nextState.status === 'completed') {
      saveGuidedOnboardingState(user.id, nextState);
      setOnboardingState(nextState);
    }

    setReplayRequested(false);
  }

  function dismissOnboarding() {
    saveOnboardingResult(getGuidedOnboardingDismissal());
    setOnboardingSessionFinished(true);
    setSuppressScheduledNotifications(true);
  }

  function completeOnboarding() {
    const completion = getGuidedOnboardingCompletion(hasActiveFamily);
    saveOnboardingResult(completion);
    setOnboardingSessionFinished(true);

    if (!hasActiveFamily) {
      navigateToSection('family');
      return;
    }

    setSuppressScheduledNotifications(true);
    setNotificationPresentation('onboarding');
  }

  const onboardingOverlay = isOnboardingVisible ? (
    <GuidedOnboardingOverlay
      onComplete={completeOnboarding}
      onDismiss={dismissOnboarding}
      onStepChange={showOnboardingStep}
      steps={onboardingSteps}
      visible
    />
  ) : null;

  function addBaby() {
    setNewBabyFormVersion((version) => version + 1);
    navigateToSection('baby', true);
  }

  function changeFamily(familyId: string) {
    navigateToSection(section);
    context.changeFamily(familyId);
  }

  function changeBaby(babyId: string) {
    navigateToSection(section);
    context.changeBaby(babyId);
  }

  const activeFamily = context.activeFamily;
  const activeSection = resolveAccessibleAppSection(
    section,
    activeBabyLifeStage,
  );
  const appBackground = getColors(colorScheme).background;
  const canManageBabies =
    activeFamily?.role === 'owner' || activeFamily?.role === 'admin';
  const canRecordCare =
    canManageBabies || activeFamily?.role === 'caregiver';
  const sessionBanner = (
    <SessionBanner
      avatarKey={activeFamily?.currentUserAvatarKey}
      avatarUrl={activeFamily?.currentUserAvatarUrl}
      email={user.email}
      relationship={activeFamily?.currentUserRelationship}
      onOpenAccountSettings={() => router.push('/settings')}
      onOpenFamilyActivity={
        canManageBabies ? () => changeSection('activity') : undefined
      }
    />
  );

  if (!activeFamily) {
    return (
      <View style={[styles.appShell, { backgroundColor: appBackground }]}>
        <CareQuickActions
          enabled={false}
          onAction={handleCareQuickAction}
          onOpenHandoff={openCareHandoff}
        />
        <CareWidgetSynchronizer
          enabled={false}
          repository={supabaseCareRepository}
          userId={user.id}
        />
        <FamilyScreen
          dataExportRepository={supabaseDataExportRepository}
          onContextChanged={(familyId) =>
            context.refresh(familyId ? { familyId } : undefined)
          }
          repository={supabaseFamilyRepository}
          topContent={sessionBanner}
          userId={user.id}
        />
        {onboardingOverlay}
      </View>
    );
  }

  const compactNavigation = width < 860;
  const topContent = (
    <AppHeader
      accountContent={sessionBanner}
      activeBaby={context.activeBaby}
      activeFamily={activeFamily}
      careAvailable={careAvailable}
      compact={compactNavigation}
      families={context.families}
      isCreatingBaby={isCreatingBaby}
      onAddBaby={addBaby}
      onChangeBaby={changeBaby}
      onChangeFamily={changeFamily}
      onChangeSection={changeSection}
      section={activeSection}
    />
  );
  const activeBabyId = context.activeBaby?.id;
  const renderAppScreen = (screen: ReactNode) => (
    <View style={[styles.appShell, { backgroundColor: appBackground }]}>
      <CareQuickActions
        enabled={careAvailable && Boolean(canRecordCare)}
        onAction={handleCareQuickAction}
        onOpenHandoff={openCareHandoff}
      />
      <CareWidgetSynchronizer
        babyId={activeBabyId}
        enabled={careAvailable}
        repository={supabaseCareRepository}
        userId={user.id}
      />
      <View style={styles.appScreen}>{screen}</View>
      <NotificationOptInModal
        familyId={activeFamily.id}
        key={notificationPresentation}
        onResolved={() => {
          setNotificationPresentation('scheduled');
          setSuppressScheduledNotifications(true);
        }}
        permissionService={pushPermissionService}
        presentation={notificationPresentation}
        repository={supabaseNotificationRepository}
        suppressed={
          notificationPresentation === 'scheduled' &&
          (isOnboardingVisible ||
            suppressScheduledNotifications ||
            onboardingShouldStart)
        }
        userId={user.id}
      />
      {onboardingOverlay}
      {compactNavigation ? (
        <View
          nativeID={Platform.OS === 'web' ? 'niduna-bottom-navigation' : undefined}
          style={[
            styles.bottomNavigation,
            Platform.OS !== 'web' && styles.bottomNavigationNative,
            { paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom },
          ]}
        >
          <AppSectionNavigation
            careAvailable={careAvailable}
            onChange={changeSection}
            placement="bottom"
            value={activeSection}
          />
        </View>
      ) : null}
    </View>
  );

  if (activeSection === 'handoff') {
    return renderAppScreen(
      <CareHandoffScreen
        babyId={context.activeBaby?.id}
        bottomNavigationInset={
          compactNavigation ? bottomNavigationContentHeight + insets.bottom : 0
        }
        canCreateBaby={canManageBabies}
        initialAction={pendingCareAction?.action}
        key={`${context.activeBaby?.id ?? `${activeFamily.id}:empty`}:${pendingCareAction?.id ?? 'default'}`}
        onExternalActionHandled={clearPendingCareAction}
        onOpenBabyProfile={() => changeSection('baby')}
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

  if (activeSection === 'history') {
    return renderAppScreen(
      <CareHistoryScreen
        babyId={context.activeBaby?.id}
        babyName={context.activeBaby?.name}
        canManage={canManageBabies}
        canRecord={canRecordCare}
        contactRepository={supabaseBabyContactRepository}
        exportHistory={exportCareHistory}
        exportReport={exportCareReport}
        familyName={activeFamily.name}
        key={context.activeBaby?.id ?? `${activeFamily.id}:history-empty`}
        onOpenSummary={() => changeSection('summary')}
        repository={supabaseCareRepository}
        topContent={topContent}
        userId={user.id}
      />,
    );
  }

  if (activeSection === 'summary') {
    return renderAppScreen(
      <DailyCareSummaryScreen
        babyId={context.activeBaby?.id}
        babyName={context.activeBaby?.name}
        key={context.activeBaby?.id ?? `${activeFamily.id}:summary-empty`}
        onOpenHistory={() => changeSection('history')}
        repository={supabaseCareSummaryRepository}
        topContent={topContent}
      />,
    );
  }

  if (activeSection === 'activity' && canManageBabies) {
    return renderAppScreen(
      <FamilyActivityScreen
        familyId={activeFamily.id}
        familyName={activeFamily.name}
        repository={supabaseFamilyAuditRepository}
        topContent={topContent}
      />,
    );
  }

  if (activeSection === 'documents' && context.activeBaby) {
    return renderAppScreen(
      <BabyDocumentsScreen
        babyId={context.activeBaby.id}
        babyName={context.activeBaby.name}
        familyRole={activeFamily.role}
        onBack={() => changeSection('baby')}
        repository={supabaseBabyDocumentRepository}
        topContent={topContent}
        userId={user.id}
      />,
    );
  }

  if (activeSection === 'contacts' && context.activeBaby) {
    return renderAppScreen(
      <BabyContactsScreen
        babyId={context.activeBaby.id}
        babyName={context.activeBaby.name}
        familyName={activeFamily.name}
        familyRole={activeFamily.role}
        onBack={() => changeSection('baby')}
        repository={supabaseBabyContactRepository}
        topContent={topContent}
        userId={user.id}
      />,
    );
  }

  if (activeSection === 'baby' && !context.activeBaby && !canManageBabies) {
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
    activeSection === 'baby' ? (
      <BabyProfileScreen
        babyId={isCreatingBaby ? undefined : context.activeBaby?.id}
        babyAvatarRepository={supabaseBabyAvatarRepository}
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
            .then(() => navigateToSection('baby'));
        }}
        onArchive={activeBabyId ? () => context.archiveBaby(activeBabyId) : undefined}
        onPhotoChanged={activeBabyId
          ? () => context.refresh({ babyId: activeBabyId, familyId: activeFamily.id })
          : undefined}
        onOpenDocuments={activeBabyId ? () => changeSection('documents') : undefined}
        onOpenContacts={activeBabyId ? () => changeSection('contacts') : undefined}
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

function resolveInitialSection(value: string | undefined): AppSection {
  return value === 'history' ||
    value === 'summary' ||
    value === 'baby' ||
    value === 'documents' ||
    value === 'contacts' ||
    value === 'family' ||
    value === 'activity'
    ? value
    : 'handoff';
}

const styles = createThemedStyleSheet((colors) => ({
  appShell: { flex: 1 },
  appScreen: { flex: 1 },
  bottomNavigation: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    zIndex: 2,
  },
  bottomNavigationNative: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
}));
