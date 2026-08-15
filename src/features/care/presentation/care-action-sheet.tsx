import { MoonStar, X } from 'lucide-react-native';
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

import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import {
  SelectField,
  type SelectOption,
} from '@/features/baby-profile/presentation/select-field';
import {
  CareOperationError,
  type CareRepository,
} from '@/features/care/application/care-repository';
import {
  parseHeadCircumferenceMillimeters,
  parseLengthMillimeters,
  parseWeightGrams,
} from '@/features/care/application/measurement-input';
import type {
  BreastSide,
  DiaperCondition,
  FeedingMethod,
  MeasurementSource,
  SleepEvent,
} from '@/features/care/domain/care-event';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

export type CareAction =
  | 'diaper'
  | 'feeding'
  | 'measurement'
  | 'note'
  | 'sleep';

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

interface CareActionSheetProps {
  action?: CareAction;
  babyId: string;
  onClose: () => void;
  onSaved: () => void;
  openSleep?: SleepEvent;
  repository: CareRepository;
}

function parseAmount(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 2000
    ? parsed
    : undefined;
}

function getOperationMessage(error: unknown): string {
  if (!(error instanceof CareOperationError)) {
    return 'No pudimos guardar el registro. Inténtalo de nuevo.';
  }

  if (error.reason === 'not_allowed') {
    return 'Tu rol familiar no permite registrar cuidados.';
  }

  if (error.reason === 'sleep_already_running') {
    return 'Ya hay un sueño en curso. Actualiza el relevo antes de continuar.';
  }

  return 'No pudimos guardar el registro. Inténtalo de nuevo.';
}

export function CareActionSheet({
  action,
  babyId,
  onClose,
  onSaved,
  openSleep,
  repository,
}: CareActionSheetProps) {
  const [feedingMethod, setFeedingMethod] =
    useState<FeedingMethod>('breast');
  const [breastSide, setBreastSide] = useState<BreastSide>();
  const [diaperCondition, setDiaperCondition] =
    useState<DiaperCondition>('wet');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [headCircumference, setHeadCircumference] = useState('');
  const [measurementSource, setMeasurementSource] =
    useState<MeasurementSource>('home');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const amountIsInvalid = Boolean(amount.trim()) && !parseAmount(amount);
  const weightGrams = parseWeightGrams(weight);
  const lengthMillimeters = parseLengthMillimeters(length);
  const headCircumferenceMillimeters =
    parseHeadCircumferenceMillimeters(headCircumference);
  const weightIsInvalid = Boolean(weight.trim()) && weightGrams === undefined;
  const lengthIsInvalid = Boolean(length.trim()) && lengthMillimeters === undefined;
  const headIsInvalid =
    Boolean(headCircumference.trim()) &&
    headCircumferenceMillimeters === undefined;
  const measurementIsEmpty =
    weightGrams === undefined &&
    lengthMillimeters === undefined &&
    headCircumferenceMillimeters === undefined;
  const noteIsInvalid = action === 'note' && !notes.trim();
  const formIsInvalid =
    amountIsInvalid ||
    noteIsInvalid ||
    (action === 'measurement' &&
      (measurementIsEmpty ||
        weightIsInvalid ||
        lengthIsInvalid ||
        headIsInvalid));
  const showsBreastSide =
    feedingMethod === 'breast' || feedingMethod === 'mixed';

  function resetForm() {
    setFeedingMethod('breast');
    setBreastSide(undefined);
    setDiaperCondition('wet');
    setAmount('');
    setNotes('');
    setWeight('');
    setLength('');
    setHeadCircumference('');
    setMeasurementSource('home');
    setErrorMessage(undefined);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSave() {
    if (!action || formIsInvalid) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      if (action === 'feeding') {
        await repository.recordFeeding({
          amountMilliliters: parseAmount(amount),
          babyId,
          breastSide: showsBreastSide ? breastSide : undefined,
          method: feedingMethod,
          notes,
        });
      } else if (action === 'diaper') {
        await repository.recordDiaper({
          babyId,
          condition: diaperCondition,
          notes,
        });
      } else if (action === 'note') {
        await repository.recordNote({ babyId, content: notes });
      } else if (action === 'measurement') {
        await repository.recordMeasurement({
          babyId,
          headCircumferenceMillimeters,
          lengthMillimeters,
          notes,
          source: measurementSource,
          weightGrams,
        });
      } else if (openSleep) {
        await repository.finishSleep(openSleep.id);
      } else {
        await repository.startSleep({ babyId, notes });
      }

      onSaved();
      handleClose();
    } catch (error) {
      setErrorMessage(getOperationMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const title =
    action === 'feeding'
      ? 'Registrar alimentación'
      : action === 'diaper'
        ? 'Registrar pañal'
        : action === 'note'
          ? 'Añadir una nota'
          : action === 'measurement'
            ? 'Registrar medidas'
        : openSleep
          ? 'Terminar sueño'
          : 'Iniciar sueño';
  const buttonLabel = openSleep && action === 'sleep' ? 'Se despertó' : 'Guardar ahora';

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      transparent
      visible={Boolean(action)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable
          accessibilityLabel="Cerrar"
          disabled={isSaving}
          onPress={handleClose}
          style={styles.dismissArea}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <View>
              <Text style={styles.eyebrow}>Se guardará con la hora actual</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
            <Pressable
              accessibilityLabel="Cerrar"
              disabled={isSaving}
              onPress={handleClose}
              style={styles.closeButton}
            >
              <X color={colors.text} size={20} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            {action === 'feeding' ? (
              <>
                <SelectField
                  label="Tipo de alimentación"
                  onChange={setFeedingMethod}
                  options={feedingOptions}
                  placeholder="Selecciona el tipo"
                  title="¿Cómo fue la alimentación?"
                  value={feedingMethod}
                />
                {showsBreastSide ? (
                  <SelectField
                    label="Lado, si quieres anotarlo"
                    onChange={setBreastSide}
                    options={breastSideOptions}
                    placeholder="Sin indicar"
                    title="¿Qué lado utilizó?"
                    value={breastSide}
                  />
                ) : null}
                {feedingMethod !== 'breast' ? (
                  <ProfileField
                    error={
                      amountIsInvalid
                        ? 'Introduce una cantidad entre 1 y 2000 ml.'
                        : undefined
                    }
                    keyboardType="number-pad"
                    label="Cantidad en ml, opcional"
                    onChangeText={setAmount}
                    placeholder="Ej. 90"
                    value={amount}
                  />
                ) : null}
              </>
            ) : null}

            {action === 'diaper' ? (
              <SelectField
                label="¿Qué había?"
                onChange={setDiaperCondition}
                options={diaperOptions}
                placeholder="Selecciona una opción"
                title="¿Qué había en el pañal?"
                value={diaperCondition}
              />
            ) : null}

            {action === 'measurement' ? (
              <>
                <SelectField
                  label="Dónde se tomaron"
                  onChange={setMeasurementSource}
                  options={measurementSourceOptions}
                  placeholder="Selecciona el origen"
                  title="Origen de las medidas"
                  value={measurementSource}
                />
                <ProfileField
                  error={
                    weightIsInvalid
                      ? 'Introduce un peso entre 0,3 y 50 kg.'
                      : undefined
                  }
                  keyboardType="decimal-pad"
                  label="Peso en kg"
                  onChangeText={setWeight}
                  placeholder="Ej. 4,850"
                  value={weight}
                />
                <ProfileField
                  error={
                    lengthIsInvalid
                      ? 'Introduce una longitud entre 20 y 150 cm.'
                      : undefined
                  }
                  keyboardType="decimal-pad"
                  label="Longitud o altura en cm"
                  onChangeText={setLength}
                  placeholder="Ej. 54,2"
                  value={length}
                />
                <ProfileField
                  error={
                    headIsInvalid
                      ? 'Introduce un perímetro entre 15 y 80 cm.'
                      : undefined
                  }
                  keyboardType="decimal-pad"
                  label="Perímetro cefálico en cm"
                  onChangeText={setHeadCircumference}
                  placeholder="Ej. 37,5"
                  value={headCircumference}
                />
                {measurementIsEmpty ? (
                  <Text style={styles.fieldHint}>
                    Introduce al menos una medida.
                  </Text>
                ) : null}
              </>
            ) : null}

            {action === 'sleep' && openSleep ? (
              <View style={styles.sleepNotice}>
                <MoonStar color={colors.lavender} size={24} />
                <View style={styles.sleepNoticeCopy}>
                  <Text style={styles.sleepNoticeTitle}>Sueño en curso</Text>
                  <Text style={styles.sleepNoticeText}>
                    Al confirmar quedará registrada la hora en que se despertó.
                  </Text>
                </View>
              </View>
            ) : action === 'note' ? (
              <ProfileField
                error={noteIsInvalid ? 'Escribe la nota antes de guardar.' : undefined}
                label="Nota para la familia"
                maxLength={1000}
                multiline
                onChangeText={setNotes}
                placeholder="Algo importante para el siguiente relevo"
                value={notes}
              />
            ) : (
              <ProfileField
                label="Nota, opcional"
                maxLength={1000}
                multiline
                onChangeText={setNotes}
                placeholder="Algo que la siguiente persona deba saber"
                value={notes}
              />
            )}

            {errorMessage ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {errorMessage}
              </Text>
            ) : null}

            <Pressable
              disabled={isSaving || formIsInvalid}
              onPress={() => void handleSave()}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.saveButtonPressed,
                (isSaving || formIsInvalid) && styles.saveButtonDisabled,
              ]}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Guardando…' : buttonLabel}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  backdrop: {
    backgroundColor: 'rgba(24, 35, 75, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissArea: { flex: 1 },
  sheet: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '88%',
    maxWidth: 680,
    paddingBottom: spacing.xl,
    width: '100%',
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    height: 5,
    marginTop: spacing.sm,
    width: 44,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  form: {
    gap: spacing.lg,
    padding: spacing.xl,
  },
  sleepNotice: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  sleepNoticeCopy: { flex: 1, gap: spacing.xs },
  sleepNoticeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  sleepNoticeText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '700',
  },
  fieldHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  saveButtonDisabled: { opacity: 0.48 },
  saveButtonPressed: { backgroundColor: colors.primaryPressed },
  saveButtonText: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '900',
  },
}));
