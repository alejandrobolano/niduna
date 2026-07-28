import { describe, expect, it } from 'vitest';

import {
  isValidEmail,
  isValidOtp,
  normalizeEmail,
  normalizeOtp,
} from '../src/features/auth/domain/auth';

describe('authentication input', () => {
  it('normalizes email before requesting a code', () => {
    expect(normalizeEmail('  Family@Example.COM ')).toBe('family@example.com');
  });

  it('accepts a well-formed email', () => {
    expect(isValidEmail('family@example.com')).toBe(true);
  });

  it('rejects an incomplete email', () => {
    expect(isValidEmail('family@example')).toBe(false);
  });

  it('keeps only the first six OTP digits', () => {
    expect(normalizeOtp('12 34-567')).toBe('123456');
  });

  it('requires exactly six OTP digits', () => {
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('12345')).toBe(false);
    expect(isValidOtp('12345a')).toBe(false);
  });
});
