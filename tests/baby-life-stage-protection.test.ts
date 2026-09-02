import { describe, expect, it } from 'vitest';

import { isBabyLifeStageProtected } from '../src/features/baby-profile/application/baby-life-stage-protection';

describe('isBabyLifeStageProtected', () => {
  it('protects a saved born profile until explicitly unlocked', () => {
    expect(isBabyLifeStageProtected('born', false)).toBe(true);
    expect(isBabyLifeStageProtected('born', true)).toBe(false);
  });

  it('does not protect expected or unsaved profiles', () => {
    expect(isBabyLifeStageProtected('expected', false)).toBe(false);
    expect(isBabyLifeStageProtected(undefined, false)).toBe(false);
  });
});
