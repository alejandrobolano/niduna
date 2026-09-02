import { Milk, Scale } from 'lucide-react-native';
import { describe, expect, it, vi } from 'vitest';

import {
  canEditCareRecord,
  getCareEventsForExport,
  getCareRecordKey,
  getSelectableCareRecordKeys,
  reconcileCareRecordSelection,
  replaceCareRecordOccurrence,
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

  it('drops selected rows that disappear after a filter or page change', () => {
    expect(
      reconcileCareRecordSelection(
        new Set(['care_event:event-1', 'baby_note:note-1']),
        [feeding],
      ),
    ).toEqual(new Set(['care_event:event-1']));
  });

  it('exports only selected records when a manual selection exists', () => {
    const secondFeeding = { ...feeding, id: 'event-2' };

    expect(
      getCareEventsForExport(
        [feeding, secondFeeding],
        new Set(['care_event:event-2']),
      ),
    ).toEqual([secondFeeding]);
  });

  it('exports the complete filtered set when nothing is selected', () => {
    expect(getCareEventsForExport([feeding], new Set())).toEqual([feeding]);
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
