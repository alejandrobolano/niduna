import type { MedicationAdministration } from '@/features/medications/domain/baby-medication';
import { canWriteFamilyResources, type FamilyRole } from '../../family/domain/family';

export function canManageMedicationCatalog(role: FamilyRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canRecordMedicationAdministration(role: FamilyRole): boolean {
  return canWriteFamilyResources(role);
}

export function canManageMedicationAdministration(
  administration: Pick<MedicationAdministration, 'recordedBy'>,
  role: FamilyRole,
  userId: string,
): boolean {
  return canWriteFamilyResources(role) && (
    administration.recordedBy === userId || role === 'owner' || role === 'admin'
  );
}
