import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
import { FamilyScreen } from '@/features/family/presentation/family-screen';
import {
  AppSectionNavigation,
  type AppSection,
} from '@/features/home/presentation/app-section-navigation';
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
  const [section, setSection] = useState<AppSection>('handoff');

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  const topContent = (
    <View style={styles.topContent}>
      <SessionBanner email={session.user.email} />
      <AppSectionNavigation onChange={setSection} value={section} />
    </View>
  );

  if (section === 'handoff') {
    return (
      <CareHandoffScreen
        exportHistory={exportCareHistory}
        onOpenBabyProfile={() => setSection('baby')}
        repository={supabaseCareRepository}
        topContent={topContent}
        userId={session.user.id}
      />
    );
  }

  return section === 'baby' ? (
    <BabyProfileScreen
      repository={supabaseBabyProfileRepository}
      topContent={topContent}
    />
  ) : (
    <FamilyScreen
      repository={supabaseFamilyRepository}
      topContent={topContent}
      userId={session.user.id}
    />
  );
}

const styles = StyleSheet.create({
  topContent: { gap: spacing.md },
});
