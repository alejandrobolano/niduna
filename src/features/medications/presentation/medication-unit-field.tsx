import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import { SelectField, type SelectOption } from '@/features/baby-profile/presentation/select-field';
import { customMedicationUnit } from '@/features/medications/domain/medication-unit';

export const medicationUnitOptions = [
  { label: 'Mililitros (ml)', value: 'ml' },
  { label: 'Miligramos (mg)', value: 'mg' },
  { label: 'Gramos (g)', value: 'g' },
  { label: 'Microgramos (mcg)', value: 'mcg' },
  { label: 'Unidades internacionales (UI)', value: 'UI' },
  { label: 'Gotas', value: 'gotas' },
  { label: 'Comprimidos', value: 'comprimidos' },
  { label: 'Cápsulas', value: 'cápsulas' },
  { label: 'Pulsaciones', value: 'pulsaciones' },
  { label: 'Otra unidad', value: customMedicationUnit },
] satisfies SelectOption<string>[];

interface MedicationUnitFieldProps {
  customValue: string;
  label: string;
  onCustomValueChange: (value: string) => void;
  onPresetChange: (value: string) => void;
  preset: string;
  required?: boolean;
}

export function MedicationUnitField({
  customValue,
  label,
  onCustomValueChange,
  onPresetChange,
  preset,
  required = false,
}: MedicationUnitFieldProps) {
  return (
    <>
      <SelectField
        label={label}
        onChange={onPresetChange}
        options={medicationUnitOptions}
        placeholder="Selecciona una unidad"
        title="Unidad de la dosis"
        value={preset}
      />
      {preset === customMedicationUnit ? (
        <ProfileField
          label={required ? 'Otra unidad' : 'Otra unidad (opcional)'}
          maxLength={30}
          onChangeText={onCustomValueChange}
          placeholder="Escribe la unidad"
          value={customValue}
        />
      ) : null}
    </>
  );
}

