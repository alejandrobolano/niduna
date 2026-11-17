import type { BabyExpense } from '@/features/baby-expenses/domain/baby-expense';
import { canWriteFamilyResources, type FamilyRole } from '../../family/domain/family';

export function canCreateBabyExpense(role: FamilyRole): boolean {
  return canWriteFamilyResources(role);
}

export function canManageBabyExpense(
  expense: Pick<BabyExpense, 'createdBy'>,
  role: FamilyRole,
  userId: string,
): boolean {
  return canWriteFamilyResources(role) && (
    expense.createdBy === userId || role === 'owner' || role === 'admin'
  );
}

