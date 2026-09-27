export type BabyExpenseCategory =
  | 'feeding'
  | 'diapers'
  | 'health'
  | 'clothing'
  | 'hygiene'
  | 'equipment'
  | 'childcare'
  | 'other';

export interface BabyExpense {
  amountMinor: number;
  babyId: string;
  category: BabyExpenseCategory;
  concept: string;
  createdBy: string;
  currency: string;
  expenseDate: string;
  id: string;
  notes?: string;
  paidByUserId: string;
  retiredAt?: string;
}

export interface ExpensePayer {
  displayName: string;
  userId: string;
}

export interface ExpenseRange {
  endDate: string;
  startDate: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toLocalIsoDate(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function createExpensePresetRange(
  preset: 'month' | '30d',
  now = new Date(),
): ExpenseRange {
  const endDate = toLocalIsoDate(now);
  if (preset === '30d') {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    return { endDate, startDate: toLocalIsoDate(start) };
  }
  return {
    endDate,
    startDate: toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 1, 12)),
  };
}

export function parseExpenseAmount(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(normalized)) return undefined;
  const amountMinor = Math.round(Number(normalized) * 100);
  return amountMinor > 0 ? amountMinor : undefined;
}

export function formatExpenseAmount(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('es-ES', {
    currency,
    style: 'currency',
  }).format(amountMinor / 100);
}
