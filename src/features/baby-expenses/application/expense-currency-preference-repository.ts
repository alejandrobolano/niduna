import type { ExpenseCurrency } from '@/features/baby-expenses/domain/expense-currency';

export interface ExpenseCurrencyPreferenceRepository {
  load(userId: string): Promise<ExpenseCurrency>;
  save(userId: string, currency: ExpenseCurrency): Promise<void>;
}
