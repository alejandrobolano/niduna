import { describe, expect, it } from 'vitest';

import { selectRecentFeedingAmounts } from '../src/features/care/application/recent-feeding-amounts';

describe('selectRecentFeedingAmounts', () => {
  it('keeps the latest three values in recency order and removes duplicates', () => {
    expect(selectRecentFeedingAmounts([120, 90, 120, 60])).toEqual([120, 90]);
  });

  it('ignores missing and invalid amounts', () => {
    expect(selectRecentFeedingAmounts([null, 0, 90, 120])).toEqual([90, 120]);
  });

  it('returns one suggestion when the recent amounts are equal', () => {
    expect(selectRecentFeedingAmounts([120, 120, 120])).toEqual([120]);
  });
});
