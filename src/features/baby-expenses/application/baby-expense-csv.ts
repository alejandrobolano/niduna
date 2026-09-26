import type { BabyExpense } from '@/features/baby-expenses/domain/baby-expense';

function quote(value: string | number): string {
  const text = String(value);
  return /[";,\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createBabyExpenseCsv(
  expenses: BabyExpense[],
  payerNames: ReadonlyMap<string, string>,
): string {
  const header = ['Fecha', 'Concepto', 'Categoría', 'Importe', 'Moneda', 'Pagado por', 'Nota'];
  const rows = expenses.map((expense) => [
    expense.expenseDate,
    expense.concept,
    expense.category,
    (expense.amountMinor / 100).toFixed(2),
    expense.currency,
    payerNames.get(expense.paidByUserId) ?? 'Miembro retirado',
    expense.notes ?? '',
  ]);
  return [header, ...rows].map((row) => row.map(quote).join(';')).join('\n');
}

