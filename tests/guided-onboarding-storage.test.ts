import { describe, expect, it } from 'vitest';

import type { GuidedOnboardingState } from '../src/features/onboarding/domain/guided-onboarding';
import {
  consumeGuidedOnboardingReplay,
  loadGuidedOnboardingState,
  requestGuidedOnboardingReplay,
  saveGuidedOnboardingState,
} from '../src/features/onboarding/infrastructure/guided-onboarding-storage';

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('guided onboarding storage', () => {
  it('stores state independently for each user', () => {
    const storage = createStorage();
    const state: GuidedOnboardingState = { status: 'completed', version: 1 };

    saveGuidedOnboardingState('user-1', state, storage);

    expect(loadGuidedOnboardingState('user-1', storage)).toEqual(state);
    expect(loadGuidedOnboardingState('user-2', storage)).toBeUndefined();
  });

  it('ignores malformed stored state', () => {
    const storage = createStorage();
    storage.setItem('niduna.guided-onboarding.user-1', '{"status":"other"}');

    expect(loadGuidedOnboardingState('user-1', storage)).toBeUndefined();
  });

  it('consumes a replay request once', () => {
    const storage = createStorage();

    requestGuidedOnboardingReplay('user-1', storage);

    expect(consumeGuidedOnboardingReplay('user-1', storage)).toBe(true);
    expect(consumeGuidedOnboardingReplay('user-1', storage)).toBe(false);
  });
});
