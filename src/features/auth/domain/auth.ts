export interface AuthenticatedUser {
  email: string;
  id: string;
}

export interface AuthSession {
  user: AuthenticatedUser;
}

export type AuthFailureCode =
  | 'invalid_code'
  | 'rate_limited'
  | 'network'
  | 'unexpected';

export class AuthFailure extends Error {
  readonly code: AuthFailureCode;

  constructor(code: AuthFailureCode) {
    super(code);
    this.name = 'AuthFailure';
    this.code = code;
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeOtp(value: string): string {
  return value.replace(/\D/g, '').slice(0, 8);
}

export function isValidOtp(value: string): boolean {
  return /^\d{6}$/.test(value);
}
