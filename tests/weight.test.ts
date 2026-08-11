import { describe, expect, it } from 'vitest';

import {
  formatGramsAsKilogramsInput,
  parseKilogramsToGrams,
} from '../src/shared/domain/weight';

describe('weight units', () => {
  it('converts kilograms entered with Spanish or decimal separators to grams', () => {
    expect(parseKilogramsToGrams('4,850')).toBe(4850);
    expect(parseKilogramsToGrams('4.5')).toBe(4500);
  });

  it('enforces the configured weight range', () => {
    expect(parseKilogramsToGrams('0,2')).toBeUndefined();
    expect(parseKilogramsToGrams('7,1', 0.3, 7)).toBeUndefined();
  });

  it('formats stored grams as an editable kilograms value', () => {
    expect(formatGramsAsKilogramsInput(4850)).toBe('4,85');
    expect(formatGramsAsKilogramsInput(4000)).toBe('4');
    expect(formatGramsAsKilogramsInput(undefined)).toBe('');
  });
});
