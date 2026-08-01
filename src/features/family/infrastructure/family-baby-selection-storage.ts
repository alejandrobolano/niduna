import type { FamilyBabySelection } from '@/features/family/domain/family-baby-context';

const storagePrefix = 'niduna.family-baby-selection';

function getStorageKey(userId: string): string {
  return `${storagePrefix}.${userId}`;
}

function isSelection(value: unknown): value is FamilyBabySelection {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.familyId === 'string' &&
    (candidate.babyId === undefined || typeof candidate.babyId === 'string')
  );
}

export function loadFamilyBabySelection(
  userId: string,
): FamilyBabySelection | undefined {
  try {
    const value = globalThis.localStorage?.getItem(getStorageKey(userId));

    if (!value) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(value);
    return isSelection(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function saveFamilyBabySelection(
  userId: string,
  selection: FamilyBabySelection | undefined,
): void {
  try {
    const storage = globalThis.localStorage;

    if (!storage) {
      return;
    }

    if (selection) {
      storage.setItem(getStorageKey(userId), JSON.stringify(selection));
    } else {
      storage.removeItem(getStorageKey(userId));
    }
  } catch {
    return;
  }
}
