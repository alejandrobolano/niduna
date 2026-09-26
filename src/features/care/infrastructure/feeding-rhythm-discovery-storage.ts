const storagePrefix = 'niduna.care.feeding-rhythm-discovered';

interface FeedingRhythmDiscoveryStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function getStorageKey(userId: string, babyId: string): string {
  return `${storagePrefix}.${userId}.${babyId}`;
}

export function hasDiscoveredFeedingRhythm(
  userId: string,
  babyId: string,
  storage: FeedingRhythmDiscoveryStorage | undefined = globalThis.localStorage,
): boolean {
  try {
    return storage?.getItem(getStorageKey(userId, babyId)) === '1';
  } catch {
    return false;
  }
}

export function markFeedingRhythmDiscovered(
  userId: string,
  babyId: string,
  storage: FeedingRhythmDiscoveryStorage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(getStorageKey(userId, babyId), '1');
  } catch {
    return;
  }
}
