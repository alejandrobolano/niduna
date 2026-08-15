export type ThemePreference = 'system' | 'light' | 'dark';

const storageKey = 'niduna.theme-preference';

interface ThemePreferenceStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function loadThemePreference(
  storage: ThemePreferenceStorage | undefined = globalThis.localStorage,
): ThemePreference {
  try {
    const value = storage?.getItem(storageKey) ?? null;
    return isThemePreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

export function saveThemePreference(
  preference: ThemePreference,
  storage: ThemePreferenceStorage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(storageKey, preference);
  } catch {
    return;
  }
}
