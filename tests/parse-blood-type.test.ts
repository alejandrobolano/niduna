import { describe, expect, it } from 'vitest';

import {
  formatBloodType,
  parseBloodType,
} from '../src/features/baby-profile/application/parse-blood-type';

describe('parseBloodType', () => {
  it('keeps an omitted clinical value absent', () => {
    expect(parseBloodType(undefined)).toEqual({});
  });

  it('splits a known blood type into group and Rh factor', () => {
    expect(parseBloodType('AB-')).toEqual({
      bloodGroup: 'AB',
      rhesusFactor: 'negative',
    });
  });

  it('records that the value does not appear in clinical documentation', () => {
    expect(parseBloodType('unknown')).toEqual({
      bloodGroup: 'unknown',
      rhesusFactor: 'unknown',
    });
  });

  it('formats a stored blood group and Rh factor for the selector', () => {
    expect(formatBloodType('O', 'negative')).toBe('O-');
  });

  it('keeps an omitted stored blood type unselected', () => {
    expect(formatBloodType(undefined, undefined)).toBeUndefined();
  });
});
