import { X } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { DatePickerField } from '@/features/baby-profile/presentation/date-picker-field';
import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import {
  SelectField,
  type SelectOption,
} from '@/features/baby-profile/presentation/select-field';
import { replaceCareRecordOccurrence } from '@/features/care/application/care-record-management';
import { TimePickerField } from '@/features/care/presentation/time-picker-field';
import {
  parseHeadCircumferenceMillimeters,
  parseLengthMillimeters,
  parseWeightGrams,
} from '@/features/care/application/measurement-input';
import type { CareRepository } from '@/features/care/application/care-repository';
import type {
  BreastSide,
  CareEvent,
  DiaperCondition,
  FeedingMethod,
  MeasurementSource,
} from '@/features/care/domain/care-event';
import { formatGramsAsKilogramsInput } from '@/shared/domain/weight';
import { dateToIso } from '@/shared/presentation/date';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

const feedingOptions = [
  { label: 'Pecho', value: 'breast' },
  { label: 'Leche extraída', value: 'expressed_milk' },
  { label: 'Fórmula', value: 'formula' },
  { label: 'Mixta', value: 'mixed' },
] satisfies SelectOption<FeedingMethod>[];

const breastSideOptions = [
  { label: 'Izquierdo', value: 'left' },
  { label: 'Derecho', value: 'right' },
  { label: 'Ambos', value: 'both' },
] satisfies SelectOption<BreastSide>[];

const diaperOptions = [
  { label: 'Pipí', value: 'wet' },
  { label: 'Caca', value: 'dirty' },
  { label: 'Ambos', value: 'both' },
] satisfies SelectOption<DiaperCondition>[];

const measurementSourceOptions = [
  { label: 'En casa', value: 'home' },
  { label: 'Pediatría', value: 'pediatrician' },
  { label: 'Hospital', value: 'hospital' },
  { label: 'Otro', value: 'other' },
] satisfies SelectOption<MeasurementSource>[];

interface CareEditSheetProps {
  event: CareEvent;
  onClose: () => void;
  onSaved: () => void;
  repository: CareRepository;
}

function decimalValue(value: number | undefined, divisor = 1): string {
  return value === undefined ? '' : String(value / divisor).replace('.', ',');
}

export function CareEditSheet({
  event,
  onClose,
  onSaved,
  repository,
}: CareEditSheetProps) {
  const initialOccurrence = new Date(event.occurredAt);
  const [date, setDate] = useState(() => dateToIso(initialOccurrence));
  const [hour, setHour] = useState(() => String(initialOccurrence.getHours()).padStart(2, '0'));
  const [minute, setMinute] = useState(() => String(initialOccurrence.getMinutes()).padStart(2, '0'));
  const [notes, setNotes] = useState(() => event.type === 'note' ? event.content : event.notes ?? '');
  const [feedingMethod, setFeedingMethod] = useState<FeedingMethod>(() => event.type === 'feeding' ? event.method : 'breast');
  const [breastSide, setBreastSide] = useState<BreastSide | undefined>(() => event.type === 'feeding' ? event.breastSide : undefined);
  const [amount, setAmount] = useState(() => event.type === 'feeding' ? decimalValue(event.amountMilliliters) : '');
  const [diaperCondition, setDiaperCondition] = useState<DiaperCondition>(() => event.type === 'diaper' ? event.condition : 'wet');
  const [measurementSource, setMeasurementSource] = useState<MeasurementSource>(() => event.type === 'measurement' ? event.source as MeasurementSource : 'home');
  const [weight, setWeight] = useState(() => event.type === 'measurement' ? formatGramsAsKilogramsInput(event.weightGrams) : '');
  const [length, setLength] = useState(() => event.type === 'measurement' ? decimalValue(event.lengthMillimeters, 10) : '');
  const [headCircumference, setHeadCircumference] = useState(() => event.type === 'measurement' ? decimalValue(event.headCircumferenceMillimeters, 10) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const weightGrams = parseWeightGrams(weight);
  const lengthMillimeters = parseLengthMillimeters(length);
  const headCircumferenceMillimeters = parseHeadCircumferenceMillimeters(headCircumference);
  const amountMilliliters = amount.trim() ? Number(amount) : undefined;
  const invalidAmount = Boolean(amount.trim()) && (!Number.isInteger(amountMilliliters) || amountMilliliters! < 1 || amountMilliliters! > 2000);
  const invalidWeight = Boolean(weight.trim()) && weightGrams === undefined;
  const invalidLength = Boolean(length.trim()) && lengthMillimeters === undefined;
  const invalidHeadCircumference = Boolean(headCircumference.trim()) && headCircumferenceMillimeters === undefined;
  const invalidMeasurement =
    event.type === 'measurement' &&
    (invalidWeight ||
      invalidLength ||
      invalidHeadCircumference ||
      (weightGrams === undefined && lengthMillimeters === undefined && headCircumferenceMillimeters === undefined));
  const invalidNote = event.type === 'note' && !notes.trim();

  async function save() {
    if (invalidAmount || invalidMeasurement || invalidNote) return;
    setIsSaving(true);
    setError(undefined);
    let updated = replaceCareRecordOccurrence(event, date, hour, minute);

    if (updated.type === 'feeding') {
      updated = {
        ...updated,
        amountMilliliters,
        breastSide:
          feedingMethod === 'breast' || feedingMethod === 'mixed'
            ? breastSide
            : undefined,
        method: feedingMethod,
        notes: notes.trim() || undefined,
      };
    } else if (updated.type === 'diaper') {
      updated = { ...updated, condition: diaperCondition, notes: notes.trim() || undefined };
    } else if (updated.type === 'note') {
      updated = { ...updated, content: notes.trim() };
    } else if (updated.type === 'measurement') {
      updated = {
        ...updated,
        headCircumferenceMillimeters,
        lengthMillimeters,
        notes: notes.trim() || undefined,
        source: measurementSource,
        weightGrams,
      };
    } else {
      updated = { ...updated, notes: notes.trim() || undefined };
    }

    try {
      await repository.updateEvent(updated);
      onSaved();
      onClose();
    } catch {
      setError('No pudimos actualizar el registro. Comprueba tus permisos y los datos.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable accessibilityLabel="Cerrar" onPress={onClose} style={styles.dismissArea} />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.heading}>
            <View>
              <Text style={styles.eyebrow}>Editar registro</Text>
              <Text style={styles.title}>Corrige los datos</Text>
            </View>
            <Pressable accessibilityLabel="Cerrar" onPress={onClose} style={styles.closeButton}>
              <X color={colors.text} size={20} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <DatePickerField label="Fecha" maximumDate={dateToIso(new Date())} onChange={setDate} value={date} />
            <TimePickerField
              hour={hour}
              minute={minute}
              onHourChange={setHour}
              onMinuteChange={setMinute}
            />
            {event.type === 'feeding' ? (
              <>
                <SelectField label="Tipo de alimentación" onChange={setFeedingMethod} options={feedingOptions} placeholder="Selecciona el tipo" title="Tipo de alimentación" value={feedingMethod} />
                {feedingMethod === 'breast' || feedingMethod === 'mixed' ? (
                  <SelectField label="Lado" onChange={setBreastSide} options={breastSideOptions} placeholder="Sin indicar" title="Lado" value={breastSide} />
                ) : null}
                {feedingMethod !== 'breast' ? (
                  <ProfileField error={invalidAmount ? 'Introduce una cantidad entre 1 y 2000 ml.' : undefined} keyboardType="number-pad" label="Cantidad en ml, opcional" onChangeText={setAmount} value={amount} />
                ) : null}
              </>
            ) : null}
            {event.type === 'diaper' ? (
              <SelectField label="Contenido" onChange={setDiaperCondition} options={diaperOptions} placeholder="Selecciona una opción" title="Contenido del pañal" value={diaperCondition} />
            ) : null}
            {event.type === 'measurement' ? (
              <>
                <SelectField label="Origen" onChange={setMeasurementSource} options={measurementSourceOptions} placeholder="Selecciona el origen" title="Origen de las medidas" value={measurementSource} />
                <ProfileField error={invalidWeight ? 'Introduce un peso entre 0,3 y 50 kg.' : undefined} keyboardType="decimal-pad" label="Peso en kg" onChangeText={setWeight} value={weight} />
                <ProfileField error={invalidLength ? 'Introduce una longitud entre 20 y 150 cm.' : undefined} keyboardType="decimal-pad" label="Longitud o altura en cm" onChangeText={setLength} value={length} />
                <ProfileField error={invalidHeadCircumference ? 'Introduce un perímetro entre 15 y 80 cm.' : undefined} keyboardType="decimal-pad" label="Perímetro cefálico en cm" onChangeText={setHeadCircumference} value={headCircumference} />
                {invalidMeasurement && !invalidWeight && !invalidLength && !invalidHeadCircumference ? <Text style={styles.error}>Introduce al menos una medida válida.</Text> : null}
              </>
            ) : null}
            <ProfileField
              error={invalidNote ? 'La nota no puede quedar vacía.' : undefined}
              label={event.type === 'note' ? 'Nota para la familia' : 'Nota, opcional'}
              maxLength={1000}
              multiline
              onChangeText={setNotes}
              value={notes}
            />
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <Pressable disabled={isSaving || invalidAmount || invalidMeasurement || invalidNote} onPress={() => void save()} style={[styles.saveButton, (isSaving || invalidAmount || invalidMeasurement || invalidNote) && styles.disabled]}>
              <Text style={styles.saveText}>{isSaving ? 'Guardando…' : 'Guardar cambios'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  backdrop: { backgroundColor: 'rgba(24, 35, 75, 0.35)', flex: 1, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: { alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '90%', maxWidth: 680, paddingBottom: spacing.xl, width: '100%' },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  eyebrow: { color: colors.coral, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: spacing.xs },
  closeButton: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, height: 40, justifyContent: 'center', width: 40 },
  form: { gap: spacing.lg, padding: spacing.xl },
  error: { color: colors.error, fontSize: 12, fontWeight: '700' },
  saveButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: radius.md, minHeight: 54, justifyContent: 'center' },
  disabled: { opacity: 0.48 },
  saveText: { color: colors.onAccent, fontSize: 16, fontWeight: '900' },
}));
