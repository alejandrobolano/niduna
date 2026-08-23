import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthLoadingScreen } from '@/features/auth/presentation/auth-loading-screen';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { AuthScreen } from '@/features/auth/presentation/auth-screen';
import { SessionBanner } from '@/features/auth/presentation/session-banner';
import { supabaseCareSummaryRepository } from '@/features/care-summary/infrastructure/supabase-care-summary-repository';
import { DailyCareSummaryScreen } from '@/features/care-summary/presentation/daily-care-summary-screen';
import { supabaseFamilyBabyContextRepository } from '@/features/family/infrastructure/supabase-family-baby-context-repository';
import { FamilyBabyContextErrorScreen } from '@/features/family/presentation/family-baby-switcher';
import { useFamilyBabyContext } from '@/features/family/presentation/use-family-baby-context';
import { AppHeader } from '@/features/home/presentation/app-header';
import { AppSectionNavigation, type AppSection } from '@/features/home/presentation/app-section-navigation';
import { createThemedStyleSheet } from '@/shared/presentation/theme';

export default function DailyCareSummaryRoute() {
  const { session, status } = useAuth();

  if (status === 'loading') return <AuthLoadingScreen />;
  if (!session) return <AuthScreen />;

  return <AuthenticatedDailyCareSummary userId={session.user.id} email={session.user.email} />;
}

function AuthenticatedDailyCareSummary({
  email,
  userId,
}: {
  email: string;
  userId: string;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const context = useFamilyBabyContext(supabaseFamilyBabyContextRepository, userId);
  const activeFamily = context.activeFamily;

  useEffect(() => {
    if (context.status === 'ready' && !activeFamily) {
      router.replace('/?section=family');
    }
  }, [activeFamily, context.status, router]);

  if (context.status === 'loading') return <AuthLoadingScreen />;
  if (context.status === 'error') {
    return <FamilyBabyContextErrorScreen onRetry={() => void context.refresh()} />;
  }

  if (!activeFamily) {
    return <AuthLoadingScreen />;
  }

  const compactNavigation = width < 860;
  const canManage = activeFamily.role === 'owner' || activeFamily.role === 'admin';

  function openSection(section: AppSection) {
    router.replace(`/?section=${section}`);
  }

  const accountContent = (
    <SessionBanner
      email={email}
      onOpenAccountSettings={() => router.push('/settings')}
      onOpenFamilyActivity={canManage ? () => openSection('activity') : undefined}
    />
  );
  const topContent = (
    <AppHeader
      accountContent={accountContent}
      activeBaby={context.activeBaby}
      activeFamily={activeFamily}
      compact={compactNavigation}
      families={context.families}
      isCreatingBaby={false}
      onAddBaby={() => router.replace('/?section=baby&createBaby=1')}
      onChangeBaby={context.changeBaby}
      onChangeFamily={context.changeFamily}
      onChangeSection={openSection}
      section="history"
    />
  );

  return (
    <View style={styles.shell}>
      <View style={styles.screen}>
        <DailyCareSummaryScreen
          babyId={context.activeBaby?.id}
          babyName={context.activeBaby?.name}
          onOpenHistory={() => openSection('history')}
          repository={supabaseCareSummaryRepository}
          topContent={topContent}
        />
      </View>
      {compactNavigation ? (
        <View style={[styles.bottomNavigation, { paddingBottom: insets.bottom }]}>
          <AppSectionNavigation
            onChange={openSection}
            placement="bottom"
            value="history"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = createThemedStyleSheet((colors) => ({
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
  screen: { flex: 1 },
  shell: { backgroundColor: colors.background, flex: 1 },
}));
