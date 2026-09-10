import { describe, expect, it } from 'vitest';

import {
  getCareEntryClockTimes,
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

  it('uses yesterday only when crossing midnight within the quick-entry window', () => {
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

  it('does not reinterpret an arbitrary future hour as yesterday', () => {
    const occurrence = resolveCareEntryTime({
      hour: 13,
      kind: 'custom',
      minute: 0,
      referenceAt: new Date(2026, 8, 10, 9).toISOString(),
    });

    expect(occurrence).toEqual(new Date(2026, 8, 10, 13));
    expect(isCareEntryTimeAllowed(occurrence, new Date(2026, 8, 10, 9))).toBe(false);
  });

  it('offers only clock times from now to two hours ago', () => {
    const options = getCareEntryClockTimes(new Date(2026, 8, 10, 1, 15, 48));

    expect(options).toHaveLength(121);
    expect(options[0]).toEqual({ hour: 23, minute: 15 });
    expect(options.at(-1)).toEqual({ hour: 1, minute: 15 });
  });

  it('accepts only valid times within the previous two hours', () => {
    expect(isCareEntryTimeAllowed(new Date(now.getTime() - 2 * 60 * 60 * 1000), now)).toBe(true);
    expect(isCareEntryTimeAllowed(new Date(now.getTime() - 2 * 60 * 60 * 1000 - 59_999), now)).toBe(true);
    expect(isCareEntryTimeAllowed(new Date(now.getTime() - 2 * 60 * 60 * 1000 - 60_000), now)).toBe(false);
    expect(isCareEntryTimeAllowed(new Date(now.getTime() + 1), now)).toBe(false);
    expect(isCareEntryTimeAllowed('invalid', now)).toBe(false);
  });
});
