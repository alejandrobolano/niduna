import { AuthLoadingScreen } from '@/features/auth/presentation/auth-loading-screen';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { AuthScreen } from '@/features/auth/presentation/auth-screen';
import { supabaseBabyProfileRepository } from '@/features/baby-profile/infrastructure/supabase-baby-profile-repository';
import { SessionBanner } from '@/features/auth/presentation/session-banner';
import { BabyProfileScreen } from '@/features/baby-profile/presentation/baby-profile-screen';

export default function IndexRoute() {
  const { session, status } = useAuth();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <BabyProfileScreen
      repository={supabaseBabyProfileRepository}
      topContent={<SessionBanner email={session.user.email} />}
    />
  );
}
