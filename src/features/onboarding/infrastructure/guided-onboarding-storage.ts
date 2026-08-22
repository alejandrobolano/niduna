import type { GuidedOnboardingState } from '@/features/onboarding/domain/guided-onboarding';

interface GuidedOnboardingStorage {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

const stateKeyPrefix = 'niduna.guided-onboarding';
const replayKeyPrefix = 'niduna.guided-onboarding-replay';

function getStateKey(userId: string): string {
  return `${stateKeyPrefix}.${userId}`;
}

function getReplayKey(userId: string): string {
  return `${replayKeyPrefix}.${userId}`;
}

function isGuidedOnboardingState(value: unknown): value is GuidedOnboardingState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<GuidedOnboardingState>;

  return (
    Number.isInteger(candidate.version) &&
    (candidate.status === 'completed' ||
      candidate.status === 'dismissed' ||
      candidate.status === 'pending-family')
  );
}

export function loadGuidedOnboardingState(
  userId: string,
  storage: GuidedOnboardingStorage | undefined = globalThis.localStorage,
): GuidedOnboardingState | undefined {
  try {
    const raw = storage?.getItem(getStateKey(userId));

    if (!raw) {
      return undefined;
    }

    const value: unknown = JSON.parse(raw);
    return isGuidedOnboardingState(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function saveGuidedOnboardingState(
  userId: string,
  state: GuidedOnboardingState,
  storage: GuidedOnboardingStorage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(getStateKey(userId), JSON.stringify(state));
  } catch {
    return;
  }
}

export function requestGuidedOnboardingReplay(
  userId: string,
  storage: GuidedOnboardingStorage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(getReplayKey(userId), '1');
  } catch {
    return;
  }
}

export function consumeGuidedOnboardingReplay(
  userId: string,
  storage: GuidedOnboardingStorage | undefined = globalThis.localStorage,
): boolean {
  try {
    const requested = storage?.getItem(getReplayKey(userId)) === '1';

    if (requested) {
      storage?.removeItem(getReplayKey(userId));
    }

    return requested;
  } catch {
    return false;
  }
}
