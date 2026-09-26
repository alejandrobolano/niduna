import type { BabyExpense } from '@/features/baby-expenses/domain/baby-expense';
import type { FamilyRole } from '@/features/family/domain/family';

export function canCreateBabyExpense(role: FamilyRole): boolean {
  return role !== 'viewer';
}

export function canManageBabyExpense(
  expense: Pick<BabyExpense, 'createdBy'>,
  role: FamilyRole,
  userId: string,
): boolean {
  return expense.createdBy === userId || role === 'owner' || role === 'admin';
}

