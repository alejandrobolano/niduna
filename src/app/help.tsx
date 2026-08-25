import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { AuthLoadingScreen } from '@/features/auth/presentation/auth-loading-screen';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { AuthScreen } from '@/features/auth/presentation/auth-screen';
import { HelpCenterScreen } from '@/features/help/presentation/help-center-screen';
import { requestGuidedOnboardingReplay } from '@/features/onboarding/infrastructure/guided-onboarding-storage';

export default function HelpRoute() {
  const { session, status } = useAuth();
  const router = useRouter();
  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/settings');
  }, [router]);

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <HelpCenterScreen
      onBack={goBack}
      onReplayOnboarding={() => {
        requestGuidedOnboardingReplay(session.user.id);
        router.replace('/');
      }}
    />
  );
}
