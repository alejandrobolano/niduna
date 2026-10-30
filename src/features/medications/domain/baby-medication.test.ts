import { describe, expect, it } from 'vitest';

import { createLocalAdministrationTimestamp, formatDose, parseDoseAmount } from './baby-medication';

describe('baby medication dose', () => {
  it('accepts positive amounts with up to three decimals', () => {
    expect(parseDoseAmount('2,5')).toBe(2.5);
    expect(parseDoseAmount('0.125')).toBe(0.125);
    expect(parseDoseAmount('0')).toBeUndefined();
    expect(parseDoseAmount('1.2345')).toBeUndefined();
  });

  it('always formats the amount with its explicit unit', () => {
    expect(formatDose(2.5, 'ml')).toBe('2,5 ml');
  });

  it('converts a valid local date and time without accepting future or invalid values', () => {
    const now = new Date(2026, 9, 30, 12, 0);
    const value = createLocalAdministrationTimestamp('2026-10-30', '11:45', now);
    expect(value).toBeDefined();
    const restored = new Date(value!);
    expect([restored.getFullYear(), restored.getMonth() + 1, restored.getDate()]).toEqual([2026, 10, 30]);
    expect([restored.getHours(), restored.getMinutes()]).toEqual([11, 45]);
    expect(createLocalAdministrationTimestamp('2026-10-30', '12:30', now)).toBeUndefined();
    expect(createLocalAdministrationTimestamp('2026-02-30', '10:00', now)).toBeUndefined();
  });
});
