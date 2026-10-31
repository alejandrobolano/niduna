export const customMedicationUnit = 'other';

export const medicationUnits = [
  'ml',
  'mg',
  'g',
  'mcg',
  'UI',
  'gotas',
  'comprimidos',
  'cápsulas',
  'pulsaciones',
] as const;

export function getMedicationUnitSelection(value: string | undefined): {
  customValue: string;
  preset: string;
} {
  const normalized = value?.trim() ?? '';
  const isPreset = medicationUnits.some((unit) => unit === normalized);

  return isPreset
    ? { customValue: '', preset: normalized }
    : normalized
      ? { customValue: normalized, preset: customMedicationUnit }
      : { customValue: '', preset: '' };
}

export function resolveMedicationUnit(preset: string, customValue: string): string {
  return preset === customMedicationUnit ? customValue.trim() : preset;
}
