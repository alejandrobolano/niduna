import { describe, expect, it } from 'vitest';

import { describeFamilyAuditEntry } from '../src/features/family-activity/application/describe-family-audit-entry';

describe('family audit descriptions', () => {
  it('describes a blood type change without exposing unrelated profile data', () => {
    expect(
      describeFamilyAuditEntry({
        action: 'updated',
        actorName: 'Alex',
        createdAt: '2026-08-09T10:00:00.000Z',
        details: {
          after: { blood_group: 'O', rhesus_factor: 'negative' },
          before: { blood_group: 'A', rhesus_factor: 'positive' },
        },
        entityType: 'baby',
        id: 1,
      }),
    ).toBe('Alex cambió el tipo de sangre de A+ a O-.');
  });

  it('describes a recorded pediatric weight', () => {
    expect(
      describeFamilyAuditEntry({
        action: 'created',
        actorName: 'Marta',
        createdAt: '2026-08-09T10:00:00.000Z',
        details: { after: { source: 'pediatrician', weight_grams: 4850 } },
        entityType: 'measurement',
        id: 2,
      }),
    ).toBe('Marta registró un peso de 4,850 kg.');
  });
});
