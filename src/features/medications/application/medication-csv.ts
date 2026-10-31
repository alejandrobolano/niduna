import type { MedicationAdministration } from '@/features/medications/domain/baby-medication';

function quote(value: string | number): string {
  const text = String(value);
  return /[";,\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function createMedicationAdministrationCsv(
  administrations: MedicationAdministration[],
): string {
  const header = [
    'Fecha y hora',
    'Medicamento o vacuna',
    'Presentación o concentración',
    'Dosis administrada',
    'Unidad',
    'Registrado por',
    'Nota',
  ];
  const rows = administrations.map((administration) => [
    administration.administeredAt,
    administration.medicationName,
    administration.medicationPresentation ?? '',
    administration.doseAmount,
    administration.doseUnit,
    administration.recorderName ?? 'Miembro de la familia',
    administration.notes ?? '',
  ]);

  return [header, ...rows].map((row) => row.map(quote).join(';')).join('\n');
}

export function createMedicationAdministrationFileName(babyName: string): string {
  const safeName = babyName.trim().replace(/[^a-z0-9áéíóúüñ]+/gi, '-').replace(/^-|-$/g, '');
  return `medicacion-${safeName || 'bebe'}.csv`;
}
