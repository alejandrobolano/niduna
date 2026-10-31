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

    expect(csv).toContain('Fecha y hora;Medicamento o vacuna;Presentación o concentración');
    expect(csv).toContain('Producto;100 mg/5 ml;2.5;ml;Alejandro');
  });

  it('keeps the presentation column empty when it was not provided', () => {
    const csv = createMedicationAdministrationCsv([
      {
        administeredAt: '2026-10-30T09:00:00.000Z',
        babyId: 'baby',
        doseAmount: 2,
        doseUnit: 'gotas',
        familyId: 'family',
        id: 'administration',
        medicationId: 'medication',
        medicationName: 'Vitamina D',
        recordedBy: 'user',
        updatedAt: '2026-10-30T09:00:00.000Z',
        updatedBy: 'user',
      },
    ]);

    expect(csv).toContain('Vitamina D;;2;gotas');
  });
});
