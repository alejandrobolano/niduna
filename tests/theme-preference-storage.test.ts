import { describe, expect, it, vi } from 'vitest';

import {
  loadThemePreference,
  saveThemePreference,
} from '../src/shared/presentation/theme-preference-storage';

function createStorage(value: string | null = null) {
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn(),
  };
}

describe('theme preference storage', () => {
  it.each(['system', 'light', 'dark'] as const)('loads the %s preference', (preference) => {
    expect(loadThemePreference(createStorage(preference))).toBe(preference);
  });

  it('falls back to the system preference for missing or invalid values', () => {
    expect(loadThemePreference(createStorage())).toBe('system');
    expect(loadThemePreference(createStorage('midnight'))).toBe('system');
  });

  it('persists the selected preference on the current device', () => {
    const storage = createStorage();

    saveThemePreference('dark', storage);

    expect(storage.setItem).toHaveBeenCalledWith('niduna.theme-preference', 'dark');
  });

  it('does not block the app when storage is unavailable', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('Unavailable');
      }),
      setItem: vi.fn(() => {
        throw new Error('Unavailable');
      }),
    };

    expect(loadThemePreference(storage)).toBe('system');
    expect(() => saveThemePreference('light', storage)).not.toThrow();
  });
});
