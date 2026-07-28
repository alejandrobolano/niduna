import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import type { AuthService } from '@/features/auth/application/auth-service';
import type { AuthSession } from '@/features/auth/domain/auth';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

interface AuthContextValue {
  requestEmailCode(email: string): Promise<void>;
  session: AuthSession | null;
  signOut(): Promise<void>;
  status: AuthStatus;
  verifyEmailCode(email: string, code: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  service: AuthService;
}

export function AuthProvider({ children, service }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;
    const unsubscribe = service.onSessionChange((nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'anonymous');
    });

    void service
      .getSession()
      .then((currentSession) => {
        if (!active) {
          return;
        }

        setSession(currentSession);
        setStatus(currentSession ? 'authenticated' : 'anonymous');
      })
      .catch(() => {
        if (active) {
          setSession(null);
          setStatus('anonymous');
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [service]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        service.startAutoRefresh();
      } else {
        service.stopAutoRefresh();
      }
    });

    service.startAutoRefresh();

    return () => {
      service.stopAutoRefresh();
      subscription.remove();
    };
  }, [service]);

  const value = useMemo<AuthContextValue>(
    () => ({
      requestEmailCode: (email) => service.requestEmailCode(email),
      session,
      signOut: () => service.signOut(),
      status,
      verifyEmailCode: async (email, code) => {
        const verifiedSession = await service.verifyEmailCode(email, code);
        setSession(verifiedSession);
        setStatus('authenticated');
      },
    }),
    [service, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
