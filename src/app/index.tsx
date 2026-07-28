import { AuthLoadingScreen } from '@/features/auth/presentation/auth-loading-screen';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { AuthScreen } from '@/features/auth/presentation/auth-screen';
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
    <BabyProfileScreen topContent={<SessionBanner email={session.user.email} />} />
  );
}
