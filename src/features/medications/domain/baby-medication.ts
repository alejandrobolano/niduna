export type BabyMedicationCategory = 'medication' | 'vaccine' | 'supplement' | 'other' | 'vitamin';
export type BabyMedicationStatus = 'active' | 'inactive';

export interface BabyMedication {
  administrationRoute?: string;
  babyId: string;
  category: BabyMedicationCategory;
  createdAt: string;
  createdBy: string;
  endDate?: string;
  familyId: string;
  id: string;
  indicatedBy?: string;
  indicatedDoseAmount: number;
  indicatedDoseUnit: string;
  instructions?: string;
  name: string;
  presentation: string;
  retiredAt?: string;
  startDate?: string;
  status: BabyMedicationStatus;
  updatedAt: string;
  updatedBy: string;
}

export interface MedicationAdministration {
  administeredAt: string;
  babyId: string;
  doseAmount: number;
  doseUnit: string;
  familyId: string;
  id: string;
  medicationId: string;
  medicationName: string;
  medicationPresentation: string;
  notes?: string;
  recordedBy: string;
  recorderName?: string;
  retiredAt?: string;
  updatedAt: string;
  updatedBy: string;
}

export const medicationCategoryLabels: Record<BabyMedicationCategory, string> = {
  medication: 'Medicamento',
  supplement: 'Suplemento',
  vitamin: 'Vitamina',
  vaccine: 'Vacuna',
  other: 'Otro',
};

export function parseDoseAmount(value: string): number | undefined {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(normalized)) return undefined;
  const amount = Number(normalized);
  return amount > 0 ? amount : undefined;
}

export function formatDoseAmount(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    maximumFractionDigits: 3,
  }).format(value);
}

export function formatDose(amount: number, unit: string): string {
  return `${formatDoseAmount(amount)} ${unit.trim()}`;
}

export function createLocalAdministrationTimestamp(
  date: string,
  time: string,
  now = new Date(),
): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return undefined;
  }
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day
    || value.getTime() > now.getTime() + 5 * 60 * 1000
  ) return undefined;
  return value.toISOString();
}
