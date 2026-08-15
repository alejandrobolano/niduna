import 'expo-sqlite/localStorage/install';

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform, useColorScheme } from 'react-native';

import {
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '@/shared/presentation/theme-preference-storage';
import {
  getColors,
  resolveColorScheme,
  setActiveColorScheme,
  type AppColorScheme,
} from '@/shared/presentation/theme';

interface ThemePreferenceContextValue {
  preference: ThemePreference;
  scheme: AppColorScheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | undefined>(undefined);

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const systemScheme = resolveColorScheme(useColorScheme());
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    Platform.OS === 'web' ? 'system' : loadThemePreference(),
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    const timeout = setTimeout(() => setPreferenceState(loadThemePreference()), 0);
    return () => clearTimeout(timeout);
  }, []);

  const scheme = preference === 'system' ? systemScheme : preference;
  setActiveColorScheme(scheme);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const background = getColors(scheme).background;
    document.documentElement.style.colorScheme = scheme;
    document.documentElement.style.backgroundColor = background;
    document.body.style.backgroundColor = background;
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute('content', background));
  }, [scheme]);

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    saveThemePreference(nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  const value = useMemo(
    () => ({ preference, scheme, setPreference }),
    [preference, scheme, setPreference],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error('useThemePreference must be used inside ThemePreferenceProvider');
  }

  return context;
}
