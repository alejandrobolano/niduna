import type { MedicationAdministration } from '@/features/medications/domain/baby-medication';
import type { FamilyRole } from '@/features/family/domain/family';

export function canManageMedicationCatalog(role: FamilyRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canRecordMedicationAdministration(role: FamilyRole): boolean {
  return role !== 'viewer';
}

export function canManageMedicationAdministration(
  administration: Pick<MedicationAdministration, 'recordedBy'>,
  role: FamilyRole,
  userId: string,
): boolean {
  return administration.recordedBy === userId || role === 'owner' || role === 'admin';
}
