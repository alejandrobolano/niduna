import type {
  BabyExpense,
  BabyExpenseCategory,
  ExpensePayer,
  ExpenseRange,
} from '@/features/baby-expenses/domain/baby-expense';

export type BabyExpensePageSize = 20 | 50 | 100;

export interface BabyExpenseDraft {
  amountMinor: number;
  category: BabyExpenseCategory;
  concept: string;
  expenseDate: string;
  notes?: string;
  paidByUserId: string;
}

export interface BabyExpenseFilters extends ExpenseRange {
  category?: BabyExpenseCategory;
  paidByUserId?: string;
  retired: boolean;
}

export interface BabyExpensePage {
  expenses: BabyExpense[];
  page: number;
  pageSize: BabyExpensePageSize;
  totalAmountMinor: number;
  totalCount: number;
  totalPages: number;
}

export type BabyExpenseErrorReason =
  | 'currency_locked'
  | 'invalid'
  | 'not_allowed'
  | 'recovery_expired'
  | 'unavailable';

export class BabyExpenseError extends Error {
  constructor(public readonly reason: BabyExpenseErrorReason) {
    super(reason);
  }
}

export interface BabyExpenseRepository {
  exportAll(babyId: string, filters: BabyExpenseFilters): Promise<BabyExpense[]>;
  loadPage(
    babyId: string,
    page: number,
    pageSize: BabyExpensePageSize,
    filters: BabyExpenseFilters,
  ): Promise<BabyExpensePage>;
  loadPayers(familyId: string): Promise<ExpensePayer[]>;
  save(babyId: string, draft: BabyExpenseDraft, expenseId?: string): Promise<string>;
  setRetired(expenseId: string, retired: boolean): Promise<void>;
}

export function removeExpenseFromPage(
  current: BabyExpensePage,
  expense: BabyExpense,
): BabyExpensePage {
  const expenses = current.expenses.filter((item) => item.id !== expense.id);
  if (expenses.length === current.expenses.length) return current;

  const totalCount = Math.max(0, current.totalCount - 1);
  return {
    ...current,
    expenses,
    totalAmountMinor: Math.max(0, current.totalAmountMinor - expense.amountMinor),
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / current.pageSize)),
  };
}
