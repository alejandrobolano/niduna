import { Milk, Scale } from 'lucide-react-native';
import { describe, expect, it, vi } from 'vitest';

import {
  canEditCareRecord,
  getCareRecordKey,
  getSelectableCareRecordKeys,
  refreshCareRecordSelection,
  replaceCareRecordOccurrence,
  toggleCareRecordSelection,
  toggleVisibleCareRecordSelection,
} from '../src/features/care/application/care-record-management';
import type { CareEvent } from '../src/features/care/domain/care-event';

vi.mock('lucide-react-native', () => ({ Milk: 'Milk', Scale: 'Scale' }));

const feeding: CareEvent = {
  babyId: 'baby-1',
  icon: Milk,
  id: 'event-1',
  method: 'breast',
  occurredAt: '2026-08-11T08:00:00.000Z',
  recordedById: 'author-1',
  sourceType: 'care_event',
  type: 'feeding',
};

describe('care record management', () => {
  it('uses a source-qualified key for mixed timeline selections', () => {
    expect(getCareRecordKey(feeding)).toBe('care_event:event-1');
  });

  it('allows active authors and managers but blocks read-only authors', () => {
    expect(canEditCareRecord(feeding, 'author-1', false, true)).toBe(true);
    expect(canEditCareRecord(feeding, 'manager-1', true, true)).toBe(true);
    expect(canEditCareRecord(feeding, 'author-1', false, false)).toBe(false);
    expect(canEditCareRecord(feeding, 'other-1', false, true)).toBe(false);
  });

  it('keeps birth measurements managed through the baby profile', () => {
    const birthMeasurement: CareEvent = {
      babyId: 'baby-1',
      icon: Scale,
      id: 'measurement-1',
      occurredAt: '2026-08-11T08:00:00.000Z',
      recordedById: 'author-1',
      source: 'birth',
      sourceType: 'measurement',
      type: 'measurement',
      weightGrams: 3250,
    };

    expect(canEditCareRecord(birthMeasurement, 'author-1', true, true)).toBe(false);
    expect(getSelectableCareRecordKeys([feeding, birthMeasurement])).toEqual(
      new Set(['care_event:event-1']),
    );
  });

  it('preserves selections from other pages and refreshes visible records', () => {
    const previousPageEvent = { ...feeding, id: 'event-previous' };
    const updatedFeeding = { ...feeding, amountMilliliters: 90 };
    const selection = new Map([
      [getCareRecordKey(previousPageEvent), previousPageEvent],
      [getCareRecordKey(feeding), feeding],
    ]);

    expect(refreshCareRecordSelection(selection, [updatedFeeding], 'baby-1')).toEqual(new Map([
      [getCareRecordKey(previousPageEvent), previousPageEvent],
      [getCareRecordKey(feeding), updatedFeeding],
    ]));
  });

  it('clears selections that belong to a different baby', () => {
    const selection = new Map([[getCareRecordKey(feeding), feeding]]);

    expect(refreshCareRecordSelection(selection, [], 'baby-2')).toEqual(new Map());
  });

  it('adds and removes one record without changing prior page selections', () => {
    const secondFeeding = { ...feeding, id: 'event-2' };
    const previousSelection = new Map([[getCareRecordKey(feeding), feeding]]);

    const withSecond = toggleCareRecordSelection(previousSelection, secondFeeding);
    expect([...withSecond.keys()]).toEqual([
      'care_event:event-1',
      'care_event:event-2',
    ]);
    expect(toggleCareRecordSelection(withSecond, secondFeeding)).toEqual(previousSelection);
  });

  it('selects and deselects only the visible page', () => {
    const previousPageEvent = { ...feeding, id: 'event-previous' };
    const secondFeeding = { ...feeding, id: 'event-2' };
    const previousSelection = new Map([
      [getCareRecordKey(previousPageEvent), previousPageEvent],
    ]);

    const allVisibleSelected = toggleVisibleCareRecordSelection(
      previousSelection,
      [feeding, secondFeeding],
    );
    expect([...allVisibleSelected.keys()]).toEqual([
      'care_event:event-previous',
      'care_event:event-1',
      'care_event:event-2',
    ]);
    expect(toggleVisibleCareRecordSelection(
      allVisibleSelected,
      [feeding, secondFeeding],
    )).toEqual(previousSelection);
  });

  it('changes the local date and time without changing the event type', () => {
    const updated = replaceCareRecordOccurrence(feeding, '2026-08-10', '14', '35');
    const localDate = new Date(updated.occurredAt);

    expect(updated.type).toBe('feeding');
    expect(localDate.getFullYear()).toBe(2026);
    expect(localDate.getMonth()).toBe(7);
    expect(localDate.getDate()).toBe(10);
    expect(localDate.getHours()).toBe(14);
    expect(localDate.getMinutes()).toBe(35);
  });
});
