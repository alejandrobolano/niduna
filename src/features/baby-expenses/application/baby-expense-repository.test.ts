import { describe, expect, it } from 'vitest';

import type { BabyExpense } from '@/features/baby-expenses/domain/baby-expense';

import { removeExpenseFromPage, type BabyExpensePage } from './baby-expense-repository';

const expense: BabyExpense = {
  amountMinor: 1250,
  babyId: 'baby-1',
  category: 'health',
  concept: 'Farmacia',
  createdBy: 'user-1',
  currency: 'EUR',
  expenseDate: '2026-09-26',
  id: 'expense-1',
  paidByUserId: 'user-1',
};

describe('removeExpenseFromPage', () => {
  it('removes the expense and updates the visible totals immediately', () => {
    const page: BabyExpensePage = {
      expenses: [expense],
      page: 1,
      pageSize: 20,
      totalAmountMinor: 1250,
      totalCount: 1,
      totalPages: 1,
    };

    expect(removeExpenseFromPage(page, expense)).toEqual({
      ...page,
      expenses: [],
      totalAmountMinor: 0,
      totalCount: 0,
    });
  });

  it('does not change a page that does not contain the expense', () => {
    const page: BabyExpensePage = {
      expenses: [],
      page: 1,
      pageSize: 20,
      totalAmountMinor: 0,
      totalCount: 0,
      totalPages: 1,
    };

    expect(removeExpenseFromPage(page, expense)).toBe(page);
  });
});
