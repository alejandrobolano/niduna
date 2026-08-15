import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Linking from 'expo-linking';
import { AppState, Platform } from 'react-native';

import type { AuthService } from '@/features/auth/application/auth-service';
import type { AuthSession } from '@/features/auth/domain/auth';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

interface AuthContextValue {
  requestEmailCode(
    email: string,
    options?: { allowCreate?: boolean },
  ): Promise<void>;
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

function clearWebAuthParameters() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  window.history.replaceState({}, document.title, window.location.pathname);
}

export function AuthProvider({ children, service }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;
    const acceptSession = (nextSession: AuthSession | null) => {
      if (!active) {
        return;
      }

      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'anonymous');
    };

    const unsubscribe = service.onSessionChange((nextSession) => {
      acceptSession(nextSession);
    });

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void service
        .completeEmailLink(url)
        .then((linkedSession) => {
          if (linkedSession) {
            clearWebAuthParameters();
            acceptSession(linkedSession);
          }
        })
        .catch(() => undefined);
    });

    void Linking.getInitialURL()
      .then(async (initialUrl) => {
        if (initialUrl) {
          try {
            const linkedSession = await service.completeEmailLink(initialUrl);
            if (linkedSession) {
              clearWebAuthParameters();
              return linkedSession;
            }
          } catch {
            return service.getSession();
          }
        }

        return service.getSession();
      })
      .then(acceptSession)
      .catch(() => {
        acceptSession(null);
      });

    return () => {
      active = false;
      linkSubscription.remove();
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
      requestEmailCode: (email, options) =>
        service.requestEmailCode(email, options),
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
