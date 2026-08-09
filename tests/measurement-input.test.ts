import { describe, expect, it } from 'vitest';

import {
  parseHeadCircumferenceMillimeters,
  parseLengthMillimeters,
  parseWeightGrams,
} from '../src/features/care/application/measurement-input';

describe('measurement input', () => {
  it('accepts Spanish decimal separators and converts to storage units', () => {
    expect(parseWeightGrams('4,850')).toBe(4850);
    expect(parseLengthMillimeters('54.2')).toBe(542);
    expect(parseHeadCircumferenceMillimeters('37,5')).toBe(375);
  });

  it('rejects values outside the supported pediatric range', () => {
    expect(parseWeightGrams('0,2')).toBeUndefined();
    expect(parseLengthMillimeters('151')).toBeUndefined();
    expect(parseHeadCircumferenceMillimeters('81')).toBeUndefined();
  });
});
