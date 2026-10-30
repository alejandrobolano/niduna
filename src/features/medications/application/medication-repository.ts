import type {
  BabyMedication,
  BabyMedicationCategory,
  BabyMedicationStatus,
  MedicationAdministration,
} from '@/features/medications/domain/baby-medication';

export type MedicationPageSize = 20 | 50 | 100;

export interface BabyMedicationDraft {
  administrationRoute?: string;
  category: BabyMedicationCategory;
  endDate?: string;
  indicatedBy?: string;
  indicatedDoseAmount: number;
  indicatedDoseUnit: string;
  instructions?: string;
  name: string;
  presentation: string;
  startDate?: string;
  status: BabyMedicationStatus;
}

export interface MedicationAdministrationDraft {
  administeredAt: string;
  doseAmount: number;
  doseUnit: string;
  medicationId: string;
  notes?: string;
}

export interface MedicationAdministrationFilters {
  endAt?: string;
  medicationId?: string;
  retired: boolean;
  startAt?: string;
}

export interface MedicationAdministrationPage {
  administrations: MedicationAdministration[];
  page: number;
  pageSize: MedicationPageSize;
  total: number;
  totalPages: number;
}

export type MedicationErrorReason =
  | 'invalid'
  | 'not_allowed'
  | 'not_found'
  | 'unavailable';

export class MedicationError extends Error {
  constructor(public readonly reason: MedicationErrorReason) {
    super(reason);
  }
}

export interface MedicationRepository {
  exportAdministrations(
    babyId: string,
    filters: MedicationAdministrationFilters,
  ): Promise<MedicationAdministration[]>;
  loadAdministrationPage(
    babyId: string,
    page: number,
    pageSize: MedicationPageSize,
    filters: MedicationAdministrationFilters,
  ): Promise<MedicationAdministrationPage>;
  loadMedications(babyId: string, retired?: boolean): Promise<BabyMedication[]>;
  saveAdministration(
    draft: MedicationAdministrationDraft,
    administrationId?: string,
  ): Promise<string>;
  saveMedication(
    babyId: string,
    draft: BabyMedicationDraft,
    medicationId?: string,
  ): Promise<string>;
  setAdministrationRetired(administrationId: string, retired: boolean): Promise<void>;
  setMedicationRetired(medicationId: string, retired: boolean): Promise<void>;
}
