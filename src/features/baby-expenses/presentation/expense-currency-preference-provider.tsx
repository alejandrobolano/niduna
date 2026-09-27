import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import type { ExpenseCurrencyPreferenceRepository } from '@/features/baby-expenses/application/expense-currency-preference-repository';
import {
  defaultExpenseCurrency,
  type ExpenseCurrency,
} from '@/features/baby-expenses/domain/expense-currency';

interface ExpenseCurrencyPreferenceContextValue {
  currency: ExpenseCurrency;
  isSaving: boolean;
  setCurrency(currency: ExpenseCurrency): Promise<void>;
}

const ExpenseCurrencyPreferenceContext =
  createContext<ExpenseCurrencyPreferenceContextValue | undefined>(undefined);

export function ExpenseCurrencyPreferenceProvider({
  children,
  repository,
  userId,
}: {
  children: ReactNode;
  repository: ExpenseCurrencyPreferenceRepository;
  userId?: string;
}) {
  const [currency, setCurrencyState] = useState<ExpenseCurrency>(defaultExpenseCurrency);
  const [isSaving, setIsSaving] = useState(false);

  const refreshCurrency = useCallback(async () => {
    if (!userId) return;
    const loadedCurrency = await repository.load(userId);
    setCurrencyState(loadedCurrency);
  }, [repository, userId]);

  useEffect(() => {
    let active = true;
    if (!userId) return () => { active = false; };

    void repository.load(userId).then((loadedCurrency) => {
      if (active) setCurrencyState(loadedCurrency);
    }).catch(() => undefined);

    return () => { active = false; };
  }, [repository, userId]);

  useEffect(() => {
    if (Platform.OS === 'web' || !userId) return undefined;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshCurrency().catch(() => undefined);
      }
    });

    return () => subscription.remove();
  }, [refreshCurrency, userId]);

  const value = useMemo<ExpenseCurrencyPreferenceContextValue>(() => ({
    currency,
    isSaving,
    async setCurrency(nextCurrency) {
      if (!userId || nextCurrency === currency) return;
      const previousCurrency = currency;
      setCurrencyState(nextCurrency);
      setIsSaving(true);
      try {
        await repository.save(userId, nextCurrency);
      } catch (error) {
        setCurrencyState(previousCurrency);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
  }), [currency, isSaving, repository, userId]);

  return (
    <ExpenseCurrencyPreferenceContext.Provider value={value}>
      {children}
    </ExpenseCurrencyPreferenceContext.Provider>
  );
}

export function useExpenseCurrencyPreference() {
  const context = useContext(ExpenseCurrencyPreferenceContext);
  if (!context) {
    throw new Error('useExpenseCurrencyPreference must be used within ExpenseCurrencyPreferenceProvider');
  }
  return context;
}
