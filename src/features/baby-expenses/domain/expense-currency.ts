export const expenseCurrencies = ['EUR', 'USD', 'GBP', 'CAD', 'MXN', 'CUP'] as const;

export type ExpenseCurrency = (typeof expenseCurrencies)[number];

export const defaultExpenseCurrency: ExpenseCurrency = 'EUR';

export function isExpenseCurrency(value: string | null | undefined): value is ExpenseCurrency {
  return expenseCurrencies.includes(value as ExpenseCurrency);
}
