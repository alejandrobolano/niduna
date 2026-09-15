import { describe, expect, it } from 'vitest';

import {
  getCareActionDeepLink,
  getCareHandoffDeepLink,
} from './care-widget-links';

describe('care widget links', () => {
  it('opens the handoff for the baby assigned to the widget', () => {
    expect(getCareHandoffDeepLink('baby 1')).toBe(
      'niduna:///?section=handoff&babyId=baby%201',
    );
  });

  it('opens a care action for the baby assigned to the widget', () => {
    expect(getCareActionDeepLink('diaper', 'baby-1')).toBe(
      'niduna:///?section=handoff&careAction=diaper&babyId=baby-1',
    );
  });
});
