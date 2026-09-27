import { describe, expect, it } from 'vitest';

import { createBabyExpenseCsv } from './baby-expense-csv';

describe('createBabyExpenseCsv', () => {
  it('exports exact amounts and escapes user text', () => {
    const csv = createBabyExpenseCsv([{
      amountMinor: 1299,
      babyId: 'baby',
      category: 'diapers',
      concept: 'Pañales; talla 1',
      createdBy: 'user',
      currency: 'EUR',
      expenseDate: '2026-09-26',
      id: 'expense',
      paidByUserId: 'user',
    }], new Map([['user', 'Alejandro']]));

    expect(csv).toContain('12.99;EUR;Alejandro');
    expect(csv).toContain('"Pañales; talla 1"');
  });

  it('uses the user display currency without changing the stored amount', () => {
    const csv = createBabyExpenseCsv([{
      amountMinor: 1299,
      babyId: 'baby',
      category: 'diapers',
      concept: 'Pañales',
      createdBy: 'user',
      currency: 'EUR',
      expenseDate: '2026-09-26',
      id: 'expense',
      paidByUserId: 'user',
    }], new Map([['user', 'Alejandro']]), 'USD');

    expect(csv).toContain('12.99;USD;Alejandro');
  });
});
