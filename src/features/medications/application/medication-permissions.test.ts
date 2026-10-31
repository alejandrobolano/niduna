import { describe, expect, it } from 'vitest';

import {
  canManageMedicationAdministration,
  canManageMedicationCatalog,
  canRecordMedicationAdministration,
} from './medication-permissions';

describe('medication permissions', () => {
  it('reserves catalog changes for family managers', () => {
    expect(canManageMedicationCatalog('owner')).toBe(true);
    expect(canManageMedicationCatalog('admin')).toBe(true);
    expect(canManageMedicationCatalog('caregiver')).toBe(false);
    expect(canManageMedicationCatalog('viewer')).toBe(false);
  });

  it('lets caregivers record administrations but keeps viewers read-only', () => {
    expect(canRecordMedicationAdministration('caregiver')).toBe(true);
    expect(canRecordMedicationAdministration('viewer')).toBe(false);
  });

  it('lets authors and managers correct an administration', () => {
    const administration = { recordedBy: 'author' };
    expect(canManageMedicationAdministration(administration, 'caregiver', 'author')).toBe(true);
    expect(canManageMedicationAdministration(administration, 'caregiver', 'other')).toBe(false);
    expect(canManageMedicationAdministration(administration, 'admin', 'other')).toBe(true);
  });
});
