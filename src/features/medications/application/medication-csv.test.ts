import { describe, expect, it } from 'vitest';

import { createMedicationAdministrationCsv } from './medication-csv';

describe('medication administration csv', () => {
  it('exports the product, presentation and explicit dose unit', () => {
    const csv = createMedicationAdministrationCsv([
      {
        administeredAt: '2026-10-30T09:00:00.000Z',
        babyId: 'baby',
        doseAmount: 2.5,
        doseUnit: 'ml',
        familyId: 'family',
        id: 'administration',
        medicationId: 'medication',
        medicationName: 'Producto',
        medicationPresentation: '100 mg/5 ml',
        recordedBy: 'user',
        recorderName: 'Alejandro',
        updatedAt: '2026-10-30T09:00:00.000Z',
        updatedBy: 'user',
      },
    ]);

    expect(csv).toContain('Producto;100 mg/5 ml;2.5;ml;Alejandro');
  });
});
