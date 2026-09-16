import type { FeedingMethod } from '@/features/care/domain/care-event';

const storagePrefix = 'niduna.care.feeding-method';

interface FeedingMethodPreferenceStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function getStorageKey(babyId: string): string {
  return `${storagePrefix}.${babyId}`;
}

function isFeedingMethod(value: string | null): value is FeedingMethod {
  return (
    value === 'breast' ||
    value === 'expressed_milk' ||
    value === 'formula' ||
    value === 'mixed'
  );
}

export function loadFeedingMethodPreference(
  babyId: string,
  storage: FeedingMethodPreferenceStorage | undefined = globalThis.localStorage,
): FeedingMethod {
  try {
    const value = storage?.getItem(getStorageKey(babyId)) ?? null;
    return isFeedingMethod(value) ? value : 'breast';
  } catch {
    return 'breast';
  }
}

export function saveFeedingMethodPreference(
  babyId: string,
  method: FeedingMethod,
  storage: FeedingMethodPreferenceStorage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(getStorageKey(babyId), method);
  } catch {
    return;
  }
}
