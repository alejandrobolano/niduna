import { BabyIcon, Milk, Moon } from 'lucide-react-native';
import { describe, expect, it, vi } from 'vitest';

import { parseCareWidgetAction } from '../src/features/care-widget/domain/care-widget-action';
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
        relativeTo: localIso(13, 52),
        value: '13:52',
      },
      feeding: {
        detail: 'Fórmula · 90 ml',
        relativeTo: localIso(14, 30),
        value: '14:30',
      },
      sleep: {
        detail: 'Desde 14:10',
        detailRelativeTo: localIso(14, 10),
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
  it('uses the same relative time language in the app and widget', () => {
    const now = new Date(2026, 8, 12, 14, 40);

    expect(formatCareEventRecency(localIso(14, 30), now)).toBe('Hace 10 min');
    expect(formatCareEventRecency(localIso(12, 30), now)).toBe(
      'Hace 2 h 10 min',
    );
  });
});
