import { describe, expect, it } from 'vitest';

import { canCreateBabyExpense, canManageBabyExpense } from './baby-expense-permissions';

describe('baby expense permissions', () => {
  it('keeps viewers read-only', () => {
    expect(canCreateBabyExpense('viewer')).toBe(false);
    expect(canCreateBabyExpense('caregiver')).toBe(true);
  });

  it('allows authors and family managers to manage expenses', () => {
    const expense = { createdBy: 'author' };
    expect(canManageBabyExpense(expense, 'caregiver', 'author')).toBe(true);
    expect(canManageBabyExpense(expense, 'caregiver', 'other')).toBe(false);
    expect(canManageBabyExpense(expense, 'admin', 'other')).toBe(true);
    expect(canManageBabyExpense(expense, 'owner', 'other')).toBe(true);
  });
});

