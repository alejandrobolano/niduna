import { describe, expect, it } from 'vitest';

import {
  isCareEntryTimeAllowed,
  resolveCareEntryTime,
} from '../src/features/care/domain/care-entry-time';

const now = new Date(2026, 8, 10, 10, 30, 45, 120);

describe('care entry time', () => {
  it('uses the save time when now is selected', () => {
    expect(resolveCareEntryTime({ kind: 'now' }, now)).toEqual(now);
  });

  it('applies a quick minute offset', () => {
    expect(resolveCareEntryTime({
      kind: 'offset',
      minutesAgo: 10,
      referenceAt: now.toISOString(),
    }, new Date(2026, 8, 10, 10, 35))).toEqual(
      new Date(2026, 8, 10, 10, 20, 45, 120),
    );
  });

  it('uses a custom time from today when it is not in the future', () => {
    expect(resolveCareEntryTime({
      hour: 9,
      kind: 'custom',
      minute: 15,
      referenceAt: now.toISOString(),
    }, now)).toEqual(
      new Date(2026, 8, 10, 9, 15),
    );
  });

  it('uses yesterday when the selected clock time is later than now', () => {
    const afterMidnight = new Date(2026, 8, 10, 0, 5);

    expect(
      resolveCareEntryTime({
        hour: 23,
        kind: 'custom',
        minute: 55,
        referenceAt: afterMidnight.toISOString(),
      }, afterMidnight),
    ).toEqual(new Date(2026, 8, 9, 23, 55));
  });

  it('accepts only valid times within the previous 24 hours', () => {
    expect(isCareEntryTimeAllowed(new Date(now.getTime() - 24 * 60 * 60 * 1000), now)).toBe(true);
    expect(isCareEntryTimeAllowed(new Date(now.getTime() - 24 * 60 * 60 * 1000 - 1), now)).toBe(false);
    expect(isCareEntryTimeAllowed(new Date(now.getTime() + 1), now)).toBe(false);
    expect(isCareEntryTimeAllowed('invalid', now)).toBe(false);
  });
});
