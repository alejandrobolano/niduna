import type { BabyExpense } from '@/features/baby-expenses/domain/baby-expense';
import type { ExpenseCurrency } from '@/features/baby-expenses/domain/expense-currency';

function quote(value: string | number): string {
  const text = String(value);
  return /[";,\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createBabyExpenseCsv(
  expenses: BabyExpense[],
  payerNames: ReadonlyMap<string, string>,
  displayCurrency?: ExpenseCurrency,
): string {
  const header = ['Fecha', 'Concepto', 'Categoría', 'Importe', 'Moneda', 'Pagado por', 'Nota'];
  const rows = expenses.map((expense) => [
    expense.expenseDate,
    expense.concept,
    expense.category,
    (expense.amountMinor / 100).toFixed(2),
    displayCurrency ?? expense.currency,
    payerNames.get(expense.paidByUserId) ?? 'Miembro retirado',
    expense.notes ?? '',
  ]);
  return [header, ...rows].map((row) => row.map(quote).join(';')).join('\n');
}
