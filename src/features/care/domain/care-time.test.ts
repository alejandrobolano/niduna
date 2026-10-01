import { describe, expect, it } from 'vitest';

import { formatCareDuration } from './care-time';

describe('care time', () => {
  it('formats durations in minutes below one hour', () => {
    expect(formatCareDuration(33)).toBe('33 min');
  });

  it('formats longer durations in hours and minutes', () => {
    expect(formatCareDuration(89)).toBe('1 h 29 min');
    expect(formatCareDuration(120)).toBe('2 h');
  });
});
