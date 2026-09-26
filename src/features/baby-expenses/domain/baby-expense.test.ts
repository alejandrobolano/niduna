import { describe, expect, it } from 'vitest';

import {
  createExpensePresetRange,
  formatExpenseAmount,
  parseExpenseAmount,
} from './baby-expense';

describe('baby expenses', () => {
  it('stores decimal amounts as integer minor units', () => {
    expect(parseExpenseAmount('12,35')).toBe(1235);
    expect(parseExpenseAmount('12.3')).toBe(1230);
  });

  it('rejects invalid, zero and over-precise amounts', () => {
    expect(parseExpenseAmount('0')).toBeUndefined();
    expect(parseExpenseAmount('1.234')).toBeUndefined();
    expect(parseExpenseAmount('gasto')).toBeUndefined();
  });

  it('formats minor units without floating point arithmetic', () => {
    expect(formatExpenseAmount(1235, 'EUR')).toContain('12,35');
  });

  it('keeps calendar dates stable around local midnight', () => {
    const now = new Date(2026, 8, 1, 0, 5);
    expect(createExpensePresetRange('month', now)).toEqual({
      endDate: '2026-09-01',
      startDate: '2026-09-01',
    });
    expect(createExpensePresetRange('30d', now).startDate).toBe('2026-08-03');
  });
});
