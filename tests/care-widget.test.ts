import { BabyIcon, Milk, Moon } from 'lucide-react-native';
import { describe, expect, it, vi } from 'vitest';

import { parseCareWidgetAction } from '../src/features/care-widget/domain/care-widget-action';
import {
  parseCareWidgetIntent,
  resolveCareWidgetTarget,
} from '../src/features/care-widget/domain/care-widget-intent';
import {
  createCareWidgetSnapshot,
  parseCareWidgetSnapshot,
} from '../src/features/care-widget/domain/care-widget-snapshot';
import { getCareActionDeepLink } from '../src/features/care-widget/infrastructure/care-widget-links';
import type { CareDashboard } from '../src/features/care/domain/care-event';
import { formatCareEventRecency } from '../src/features/care/domain/care-time';

vi.mock('lucide-react-native', () => ({
  BabyIcon: 'BabyIcon',
  Milk: 'Milk',
  Moon: 'Moon',
}));

function localIso(hour: number, minute: number): string {
  return new Date(2026, 8, 12, hour, minute).toISOString();
}

const dashboard: CareDashboard = {
  baby: { id: 'baby-1', lifeStage: 'born', name: 'Stephanie' },
  canManage: true,
  canRecord: true,
  events: [
    {
      amountMilliliters: 90,
      babyId: 'baby-1',
      icon: Milk,
      id: 'feeding-1',
      method: 'formula',
      occurredAt: localIso(14, 30),
      recordedById: 'user-1',
      sourceType: 'care_event',
      type: 'feeding',
    },
    {
      babyId: 'baby-1',
      condition: 'wet',
      icon: BabyIcon,
      id: 'diaper-1',
      occurredAt: localIso(13, 52),
      recordedById: 'user-1',
      sourceType: 'care_event',
      type: 'diaper',
    },
    {
      babyId: 'baby-1',
      icon: Moon,
      id: 'sleep-1',
      occurredAt: localIso(14, 10),
      recordedById: 'user-1',
      sourceType: 'care_event',
      type: 'sleep',
    },
  ],
  weightMeasurements: [],
};

describe('care widget snapshot', () => {
  it('summarizes the latest care events for the active baby', () => {
    const snapshot = createCareWidgetSnapshot(
      dashboard,
      new Date(2026, 8, 12, 14, 40),
    );

    expect(snapshot).toMatchObject({
      babyName: 'Stephanie',
      diaper: {
        detail: 'Pipí',
        value: '13:52',
      },
      feeding: {
        detail: 'Fórmula · 90 ml',
        value: '14:30',
      },
      sleep: {
        detail: 'Desde 14:10',
        value: 'Durmiendo',
      },
    });
  });

  it('validates persisted widget data before rendering it', () => {
    const snapshot = createCareWidgetSnapshot(dashboard);

    expect(parseCareWidgetSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(parseCareWidgetSnapshot('{"babyName":true}')).toBeUndefined();
  });
});

describe('care widget actions', () => {
  it('accepts only actions supported by the quick care flow', () => {
    expect(parseCareWidgetAction('feeding')).toBe('feeding');
    expect(parseCareWidgetAction('measurement')).toBeUndefined();
    expect(parseCareWidgetAction(undefined)).toBeUndefined();
  });

  it('parses the baby and action from a widget deep link', () => {
    expect(
      parseCareWidgetIntent(
        'niduna:///?section=handoff&careAction=diaper&babyId=baby-2',
      ),
    ).toEqual({
      action: 'diaper',
      babyId: 'baby-2',
      openHandoff: true,
    });
  });

  it('allows only accessible born babies for widget actions', () => {
    const families = [
      {
        archivedBabies: [],
        babies: [
          { id: 'baby-born', lifeStage: 'born' as const, name: 'Luna' },
          { id: 'baby-expected', lifeStage: 'expected' as const, name: 'Sol' },
        ],
        id: 'family-1',
        name: 'Familia',
        role: 'caregiver' as const,
        unfollowedBabies: [],
      },
    ];

    expect(
      resolveCareWidgetTarget({
        activeBabyId: 'baby-expected',
        activeFamilyId: 'family-1',
        babyId: 'baby-born',
        families,
        requireRecordingPermission: true,
      }),
    ).toBe('baby-born');
    expect(
      resolveCareWidgetTarget({
        activeBabyId: 'baby-born',
        activeFamilyId: 'family-1',
        babyId: 'baby-expected',
        families,
        requireRecordingPermission: true,
      }),
    ).toBeUndefined();
    expect(
      resolveCareWidgetTarget({
        activeBabyId: 'baby-born',
        activeFamilyId: 'family-1',
        babyId: 'unknown',
        families,
        requireRecordingPermission: false,
      }),
    ).toBeUndefined();
  });

  it('builds a direct link for every quick care action', () => {
    expect(getCareActionDeepLink('feeding')).toBe(
      'niduna:///?section=handoff&careAction=feeding',
    );
    expect(getCareActionDeepLink('diaper')).toBe(
      'niduna:///?section=handoff&careAction=diaper',
    );
    expect(getCareActionDeepLink('sleep')).toBe(
      'niduna:///?section=handoff&careAction=sleep',
    );
  });
});

describe('care event recency', () => {
  it('formats relative care time for the main app', () => {
    const now = new Date(2026, 8, 12, 14, 40);

    expect(formatCareEventRecency(localIso(14, 30), now)).toBe('Hace 10 min');
    expect(formatCareEventRecency(localIso(12, 30), now)).toBe(
      'Hace 2 h 10 min',
    );
  });
});
