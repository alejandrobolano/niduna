import type { AuthSession } from '@/features/auth/domain/auth';

export interface AuthService {
  completeEmailLink(url: string): Promise<AuthSession | null>;
  getSession(): Promise<AuthSession | null>;
  onSessionChange(listener: (session: AuthSession | null) => void): () => void;
  requestEmailCode(
    email: string,
    options?: { allowCreate?: boolean },
  ): Promise<void>;
  signOut(): Promise<void>;
  startAutoRefresh(): void;
  stopAutoRefresh(): void;
  verifyEmailCode(email: string, code: string): Promise<AuthSession>;
}
