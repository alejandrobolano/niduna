import { describe, expect, it } from 'vitest';

import {
  getGuidedOnboardingCompletion,
  getGuidedOnboardingDismissal,
  getGuidedOnboardingSteps,
  guidedOnboardingVersion,
  shouldStartGuidedOnboarding,
} from '../src/features/onboarding/domain/guided-onboarding';

describe('guided onboarding', () => {
  it('starts for a first visit and after a version change', () => {
    expect(shouldStartGuidedOnboarding(undefined, true)).toBe(true);
    expect(
      shouldStartGuidedOnboarding(
        { status: 'completed', version: guidedOnboardingVersion - 1 },
        true,
      ),
    ).toBe(true);
  });

  it('does not repeat a completed or dismissed version', () => {
    expect(
      shouldStartGuidedOnboarding(
        { status: 'completed', version: guidedOnboardingVersion },
        true,
      ),
    ).toBe(false);
    expect(
      shouldStartGuidedOnboarding(getGuidedOnboardingDismissal(), true),
    ).toBe(false);
  });

  it('defers the full tour until a family exists', () => {
    const pending = getGuidedOnboardingCompletion(false);

    expect(pending.status).toBe('pending-family');
    expect(shouldStartGuidedOnboarding(pending, false)).toBe(false);
    expect(shouldStartGuidedOnboarding(pending, true)).toBe(true);
  });

  it('uses one family step without a family', () => {
    const steps = getGuidedOnboardingSteps({
      hasActiveBaby: false,
      hasActiveFamily: false,
    });

    expect(steps).toHaveLength(1);
    expect(steps[0]?.section).toBe('family');
  });

  it('uses the three product areas, closes with help, and adapts the handoff copy without a baby', () => {
    const steps = getGuidedOnboardingSteps({
      hasActiveBaby: false,
      hasActiveFamily: true,
    });

    expect(steps.map((step) => step.id)).toEqual([
      'handoff',
      'history',
      'family',
      'help',
    ]);
    expect(steps[0]?.title).toContain('bebé');
    expect(steps.at(-1)?.section).toBeUndefined();
  });

  it('does not navigate to care history while the active baby is expected', () => {
    const steps = getGuidedOnboardingSteps({
      careHistoryAvailable: false,
      hasActiveBaby: true,
      hasActiveFamily: true,
    });

    expect(steps.map((step) => step.id)).toEqual([
      'handoff',
      'family',
      'help',
    ]);
    expect(steps[0]?.title).toBe('Todo listo para su llegada');
    expect(steps.some((step) => step.section === 'history')).toBe(false);
  });
});
