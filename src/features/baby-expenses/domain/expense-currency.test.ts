import { describe, expect, it } from 'vitest';

import {
  defaultExpenseCurrency,
  expenseCurrencies,
  isExpenseCurrency,
} from './expense-currency';

describe('expense currency', () => {
  it('accepts every supported display currency', () => {
    expect(expenseCurrencies.every(isExpenseCurrency)).toBe(true);
  });

  it('rejects unsupported or missing values', () => {
    expect(isExpenseCurrency('JPY')).toBe(false);
    expect(isExpenseCurrency(null)).toBe(false);
    expect(isExpenseCurrency(undefined)).toBe(false);
  });

  it('uses EUR as the default display currency', () => {
    expect(defaultExpenseCurrency).toBe('EUR');
  });
});
