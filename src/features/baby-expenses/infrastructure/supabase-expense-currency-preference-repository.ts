import type { ExpenseCurrencyPreferenceRepository } from '@/features/baby-expenses/application/expense-currency-preference-repository';
import {
  defaultExpenseCurrency,
  isExpenseCurrency,
} from '@/features/baby-expenses/domain/expense-currency';
import { supabase } from '@/shared/infrastructure/supabase/client';

export const supabaseExpenseCurrencyPreferenceRepository: ExpenseCurrencyPreferenceRepository = {
  async load(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('expense_display_currency')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);
    return isExpenseCurrency(data.expense_display_currency)
      ? data.expense_display_currency
      : defaultExpenseCurrency;
  },

  async save(userId, currency) {
    const { error } = await supabase
      .from('profiles')
      .update({ expense_display_currency: currency })
      .eq('id', userId);

    if (error) throw new Error(error.message);
  },
};
