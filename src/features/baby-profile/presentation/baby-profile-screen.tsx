import {
  Heart,
  HeartHandshake,
  MoveVertical,
  Plus,
  Sparkles,
  Sun
} from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BabyProfileRepository } from '@/features/baby-profile/application/baby-profile-repository';
import {
  formatBloodType,
  parseBloodType,
  type BloodTypeSelection,
} from '@/features/baby-profile/application/parse-blood-type';
import { validateBabyProfile } from '@/features/baby-profile/application/validate-baby-profile';
import type {
  BabyLifeStage,
  BabyProfile,
  SexAtBirth,
} from '@/features/baby-profile/domain/baby-profile';
import { DatePickerField } from '@/features/baby-profile/presentation/date-picker-field';
import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import { SegmentedControl } from '@/features/baby-profile/presentation/segmented-control';
import {
  SelectField,
  type SelectOption,
} from '@/features/baby-profile/presentation/select-field';
import { dateToIso } from '@/shared/presentation/date';
import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { colors, radius, spacing } from '@/shared/presentation/theme';

const lifeStageOptions = [
  { label: 'Aún por nacer', value: 'expected' },
  { label: 'Ya nació', value: 'born' },
] satisfies { label: string; value: BabyLifeStage }[];

const sexOptions = [
  { label: 'Niña', value: 'female' },
  { label: 'Niño', value: 'male' },
  { label: 'Otro', value: 'intersex' },
  { label: 'Sin indicar', value: 'unknown' },
] satisfies { label: string; value: SexAtBirth }[];

const bloodTypeOptions = [
  { label: 'A+', value: 'A+' },
  { label: 'A−', value: 'A-' },
  { label: 'B+', value: 'B+' },
  { label: 'B−', value: 'B-' },
  { label: 'AB+', value: 'AB+' },
  { label: 'AB−', value: 'AB-' },
  { label: 'O+', value: 'O+' },
  { label: 'O−', value: 'O-' },
  {
    label: 'No consta',
    supportingText: 'Todavía no aparece en la documentación',
    value: 'unknown',
  },
] satisfies SelectOption<BloodTypeSelection>[];

interface SectionHeadingProps {
  accent: string;
  icon?: React.ComponentType<{ color?: string; size?: number }>;
  optional?: boolean;
  title: string;
}

function SectionHeading({ accent, icon: Icon, optional = false, title }: SectionHeadingProps) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionIcon, { backgroundColor: accent }]}>
          {Icon ? <Icon color={colors.text} size={16} /> : null}
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {optional ? <Text style={styles.optional}>Opcional</Text> : null}
    </View>
  );
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) ? number : undefined;
}

interface BabyProfileScreenProps {
  babyId?: string;
  canArchive?: boolean;
  familyId: string;
  onArchive?: () => Promise<void>;
  onSaved?: (babyId: string) => void;
  onUnfollow?: () => Promise<void>;
  repository: BabyProfileRepository;
  topContent?: ReactNode;
}

export function BabyProfileScreen({
  babyId: selectedBabyId,
  canArchive = false,
  familyId,
  onArchive,
  onSaved,
  onUnfollow,
  repository,
  topContent,
}: BabyProfileScreenProps) {
  const [lifeStage, setLifeStage] = useState<BabyLifeStage>('expected');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [sexAtBirth, setSexAtBirth] = useState<SexAtBirth>('unknown');
  const [gestationalWeeks, setGestationalWeeks] = useState('');
  const [gestationalDays, setGestationalDays] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [lengthCentimeters, setLengthCentimeters] = useState('');
  const [headCircumference, setHeadCircumference] = useState('');
  const [bloodType, setBloodType] = useState<BloodTypeSelection>();
  const [notes, setNotes] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);
  const [storedBabyId, setStoredBabyId] = useState<string>();
  const [lastSavedProfile, setLastSavedProfile] = useState<BabyProfile>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [pendingAccessAction, setPendingAccessAction] = useState<
    'archive' | 'unfollow'
  >();
  const [isChangingAccess, setIsChangingAccess] = useState(false);
  const [accessError, setAccessError] = useState(false);

  useEffect(() => {
    let active = true;

    void repository
      .load(selectedBabyId)
      .then((storedProfile) => {
        if (!active || !storedProfile) {
          return;
        }

        const loadedProfile = storedProfile.profile;
        const measurement = loadedProfile.birthMeasurement;

        setStoredBabyId(storedProfile.id);
        setLifeStage(loadedProfile.lifeStage);
        setName(loadedProfile.name);
        setDate(
          loadedProfile.lifeStage === 'expected'
            ? (loadedProfile.expectedDueDate ?? '')
            : (loadedProfile.birthDate ?? ''),
        );
        setSexAtBirth(loadedProfile.sexAtBirth ?? 'unknown');
        setGestationalWeeks(
          loadedProfile.gestationalAgeWeeks?.toString() ?? '',
        );
        setGestationalDays(loadedProfile.gestationalAgeDays?.toString() ?? '');
        setWeightGrams(measurement?.weightGrams?.toString() ?? '');
        setLengthCentimeters(
          measurement?.lengthCentimeters?.toString() ?? '',
        );
        setHeadCircumference(
          measurement?.headCircumferenceCentimeters?.toString() ?? '',
        );
        setBloodType(
          formatBloodType(
            loadedProfile.bloodGroup,
            loadedProfile.rhesusFactor,
          ),
        );
        setNotes(loadedProfile.notes ?? '');
        setLastSavedProfile(loadedProfile);
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadAttempt, repository, selectedBabyId]);

  async function handleAccessAction() {
    const action =
      pendingAccessAction === 'archive' ? onArchive : onUnfollow;

    if (!action) {
      return;
    }

    setIsChangingAccess(true);
    setAccessError(false);

    try {
      await action();
    } catch {
      setAccessError(true);
      setIsChangingAccess(false);
    }
  }

  const profile = useMemo<BabyProfile>(
    () => {
      const bloodDetails = parseBloodType(bloodType);

      return {
        lifeStage,
        name,
        expectedDueDate: lifeStage === 'expected' ? date : undefined,
        birthDate: lifeStage === 'born' ? date : undefined,
        sexAtBirth,
        ...bloodDetails,
        gestationalAgeWeeks: parseOptionalNumber(gestationalWeeks),
        gestationalAgeDays: parseOptionalNumber(gestationalDays),
        birthMeasurement:
          lifeStage === 'born'
            ? {
                weightGrams: parseOptionalNumber(weightGrams),
                lengthCentimeters: parseOptionalNumber(lengthCentimeters),
                headCircumferenceCentimeters: parseOptionalNumber(headCircumference),
              }
            : undefined,
        notes: notes.trim() || undefined,
      };
    },
    [
      bloodType,
      date,
      gestationalDays,
      gestationalWeeks,
      headCircumference,
      lengthCentimeters,
      lifeStage,
      name,
      notes,
      sexAtBirth,
      weightGrams,
    ],
  );

  const validationErrors = useMemo(
    () => (hasReviewed ? validateBabyProfile(profile) : []),
    [hasReviewed, profile],
  );
  const isValid = hasReviewed && validationErrors.length === 0;
  const hasUnsavedChanges =
    !lastSavedProfile ||
    JSON.stringify(profile) !== JSON.stringify(lastSavedProfile);
  const isSaved = Boolean(lastSavedProfile) && !hasUnsavedChanges;

  function getError(field: keyof BabyProfile | 'birthMeasurement'): string | undefined {
    return validationErrors.find((error) => error.field === field)?.message;
  }

  async function handleSave() {
    setHasReviewed(true);
    setSaveError(false);

    if (validateBabyProfile(profile).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const storedProfile = await repository.save({
        babyId: storedBabyId,
        familyId,
        profile,
      });
      setStoredBabyId(storedProfile.id);
      setName(storedProfile.profile.name);
      setNotes(storedProfile.profile.notes ?? '');
      setLastSavedProfile(storedProfile.profile);
      onSaved?.(storedProfile.id);
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateScreen}>
          <NuniMascot size={150} />
          <Text style={styles.stateTitle}>Preparando el perfil</Text>
          <Text style={styles.stateText}>
            Estamos recuperando la información guardada de tu familia.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateScreen}>
          <NuniMascot size={150} />
          <Text style={styles.stateTitle}>No pudimos cargar el perfil</Text>
          <Text style={styles.stateText}>
            Revisa tu conexión e inténtalo de nuevo. Tus datos siguen seguros.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setIsLoading(true);
              setLoadError(false);
              setLoadAttempt((attempt) => attempt + 1);
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.retryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Volver a intentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {topContent}
          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>NIDUNA</Text>
              <Text style={styles.title}>Perfil del bebé</Text>
              <Text style={styles.subtitle}>
                Su información importante, clara y cerca de toda la familia.
              </Text>
            </View>
            <View style={styles.mascot}>
              <NuniMascot size={220} />
            </View>
          </View>

          <View style={styles.photoCard}>
            <View style={styles.photoPlaceholder}>
              <Heart color={colors.coral} size={24} />
            </View>
            <View style={styles.photoCopy}>
              <Text style={styles.photoTitle}>Foto del bebé</Text>
              <Text style={styles.photoHint}>
                Será privada y visible solo para la familia autorizada.
              </Text>
            </View>
            <View style={styles.privateBadge}>
              <Text style={styles.privateBadgeText}>PRIVADA</Text>
            </View>
          </View>

          <View style={[styles.section, styles.momentSection]}>
            <SectionHeading accent={colors.butter} icon={Sun} title="Momento" />
            <SegmentedControl
              onChange={(value) => {
                setLifeStage(value);
                setDate('');
                setHasReviewed(false);
              }}
              options={lifeStageOptions}
              value={lifeStage}
            />
          </View>

          <View style={styles.section}>
            <SectionHeading accent={colors.aquaSoft} icon={Heart} title="Datos principales" />
            <ProfileField
              autoCapitalize="words"
              error={getError('name')}
              label="Nombre"
              onChangeText={setName}
              placeholder="Nombre del bebé"
              value={name}
            />
            <DatePickerField
              error={getError(lifeStage === 'expected' ? 'expectedDueDate' : 'birthDate')}
              label={lifeStage === 'expected' ? 'Fecha probable de parto' : 'Fecha de nacimiento'}
              maximumDate={lifeStage === 'born' ? dateToIso(new Date()) : undefined}
              onChange={setDate}
              value={date}
            />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Sexo registrado al nacer</Text>
              <SegmentedControl
                onChange={setSexAtBirth}
                options={sexOptions}
                value={sexAtBirth}
              />
              <Text style={styles.fieldHint}>
                Es opcional y se utiliza únicamente cuando aporta contexto de salud.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeading
              accent={colors.lavenderSoft}
              icon={Sparkles}
              optional
              title="Gestación"
            />
            <View style={styles.inlineFields}>
              <ProfileField
                error={getError('gestationalAgeWeeks')}
                keyboardType="number-pad"
                label="Semanas"
                maxLength={2}
                onChangeText={setGestationalWeeks}
                placeholder="40"
                value={gestationalWeeks}
              />
              <ProfileField
                error={getError('gestationalAgeDays')}
                keyboardType="number-pad"
                label="Días"
                maxLength={1}
                onChangeText={setGestationalDays}
                placeholder="0"
                value={gestationalDays}
              />
            </View>
            <Text style={styles.explainer}>
              Ayuda a calcular la edad corregida si el nacimiento fue prematuro.
            </Text>
          </View>

          {lifeStage === 'born' ? (
            <View style={styles.section}>
              <SectionHeading
                accent={colors.butterSoft}
                icon={MoveVertical}
                optional
                title="Medidas al nacer"
              />
              <ProfileField
                error={getError('birthMeasurement')}
                keyboardType="decimal-pad"
                label="Peso"
                onChangeText={setWeightGrams}
                placeholder="Ej. 3250"
                trailing={<Text style={styles.unit}>g</Text>}
                value={weightGrams}
              />
              <View style={styles.inlineFields}>
                <ProfileField
                  keyboardType="decimal-pad"
                  label="Longitud"
                  onChangeText={setLengthCentimeters}
                  placeholder="50"
                  trailing={<Text style={styles.unit}>cm</Text>}
                  value={lengthCentimeters}
                />
                <ProfileField
                  keyboardType="decimal-pad"
                  label="Perímetro cefálico"
                  onChangeText={setHeadCircumference}
                  placeholder="35"
                  trailing={<Text style={styles.unit}>cm</Text>}
                  value={headCircumference}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeading
              accent={colors.peach}
              icon={Plus}
              optional
              title="Información de salud"
            />
            <SelectField
              eyebrow="INFORMACIÓN DE SALUD"
              hint="No lo deduzcas. Déjalo vacío si no aparece en documentación clínica."
              label="Grupo sanguíneo y Rh"
              onChange={setBloodType}
              options={bloodTypeOptions}
              placeholder="Seleccionar si consta"
              title="Grupo sanguíneo y Rh"
              value={bloodType}
            />
            <ProfileField
              label="Observaciones"
              multiline
              numberOfLines={4}
              onChangeText={setNotes}
              placeholder="Información que ayude a la familia a cuidar mejor"
              style={styles.notesInput}
              textAlignVertical="top"
              value={notes}
            />
          </View>

          <View style={styles.privacyNotice}>
            <View style={styles.privacyIcon}>
              <HeartHandshake color={colors.primary} size={20} />
            </View>
            <View style={styles.privacyCopy}>
              <Text style={styles.privacyTitle}>Privado para tu familia</Text>
              <Text style={styles.privacyText}>
                Cada persona necesitará una invitación y tendrá permisos propios.
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={isSaving || (!hasUnsavedChanges && Boolean(storedBabyId))}
            onPress={() => void handleSave()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              (isSaving || (!hasUnsavedChanges && Boolean(storedBabyId))) &&
                styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isSaving
                ? 'Guardando…'
                : !hasUnsavedChanges && storedBabyId
                  ? 'Perfil al día'
                  : storedBabyId
                    ? 'Guardar cambios'
                    : 'Guardar perfil'}
            </Text>
          </Pressable>
          {hasReviewed || saveError || isSaved ? (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.reviewNotice,
                (isSaved || isValid) && !saveError
                  ? styles.reviewNoticeSuccess
                  : styles.reviewNoticeError,
              ]}
            >
              <View
                style={[
                  styles.reviewMark,
                  (isSaved || isValid) &&
                    !saveError &&
                    styles.reviewMarkSuccess,
                ]}
              >
                <Text
                  style={[
                    styles.reviewMarkText,
                    (isSaved || isValid) &&
                      !saveError &&
                      styles.reviewMarkTextSuccess,
                  ]}
                >
                  {(isSaved || isValid) && !saveError
                    ? '✓'
                    : validationErrors.length || '!'}
                </Text>
              </View>
              <View style={styles.reviewCopy}>
                <Text style={styles.reviewTitle}>
                  {saveError
                    ? 'No pudimos guardar el perfil'
                    : isSaved
                      ? 'Perfil guardado'
                      : isValid
                        ? 'Datos listos para guardar'
                        : 'Hay datos que necesitan revisión'}
                </Text>
                <Text style={styles.reviewText}>
                  {saveError
                    ? 'Tus cambios siguen en pantalla. Revisa la conexión y vuelve a intentarlo.'
                    : isSaved
                      ? 'La información está protegida y disponible cuando vuelvas a entrar.'
                      : isValid
                        ? 'Pulsa guardar para conservar los cambios de forma segura.'
                        : 'Los campos marcados indican exactamente qué debes corregir.'}
                </Text>
              </View>
            </View>
          ) : null}
          {storedBabyId && onUnfollow ? (
            <View style={styles.accessSection}>
              <Text style={styles.accessTitle}>Seguimiento en esta familia</Text>
              <Text style={styles.accessText}>
                Puedes ocultar este perfil sólo para ti. Si administras la
                familia, también puedes retirarlo para todos sin borrar su
                historial.
              </Text>
              <Pressable
                accessibilityRole="link"
                disabled={isChangingAccess}
                onPress={() => {
                  setAccessError(false);
                  setPendingAccessAction('unfollow');
                }}
              >
                <Text style={styles.accessLink}>Dejar de seguir a {name}</Text>
              </Pressable>
              {canArchive && onArchive ? (
                <Pressable
                  accessibilityRole="link"
                  disabled={isChangingAccess}
                  onPress={() => {
                    setAccessError(false);
                    setPendingAccessAction('archive');
                  }}
                >
                  <Text style={[styles.accessLink, styles.destructiveLink]}>
                    Quitar a {name} de esta familia
                  </Text>
                </Pressable>
              ) : null}
              {pendingAccessAction ? (
                <View style={styles.confirmationCard}>
                  <Text style={styles.confirmationTitle}>
                    {pendingAccessAction === 'archive'
                      ? `¿Quitar a ${name} de la familia?`
                      : `¿Dejar de seguir a ${name}?`}
                  </Text>
                  <Text style={styles.confirmationText}>
                    {pendingAccessAction === 'archive'
                      ? `${name} dejará de estar disponible para todos. Su perfil y su historial se conservarán para poder restaurarlos.`
                      : `Sólo dejarás de verlo tú. El resto de la familia continuará con su seguimiento.`}
                  </Text>
                  <View style={styles.confirmationActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isChangingAccess}
                      onPress={() => setPendingAccessAction(undefined)}
                      style={styles.confirmationCancel}
                    >
                      <Text style={styles.confirmationCancelText}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isChangingAccess}
                      onPress={() => void handleAccessAction()}
                      style={styles.confirmationAccept}
                    >
                      <Text style={styles.confirmationAcceptText}>
                        {isChangingAccess
                          ? 'Actualizando…'
                          : pendingAccessAction === 'archive'
                            ? 'Quitar de la familia'
                            : 'Dejar de seguir'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
              {accessError ? (
                <Text accessibilityLiveRegion="polite" style={styles.accessError}>
                  No pudimos actualizar el seguimiento. Inténtalo de nuevo.
                </Text>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: {
    alignSelf: 'center',
    gap: spacing.xl,
    maxWidth: 720,
    paddingBottom: 64,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: '100%',
  },
  hero: {
    backgroundColor: colors.sky,
    borderRadius: 32,
    minHeight: 230,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  heroCopy: { maxWidth: 360, zIndex: 2 },
  eyebrow: {
    color: colors.coral,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.4,
    marginBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: spacing.sm,
    maxWidth: 290,
  },
  mascot: { alignSelf: 'flex-end', marginBottom: -14, marginRight: -10, marginTop: -15 },
  photoCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  photoCopy: { flex: 1 },
  photoTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  photoHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  privateBadge: {
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  privateBadgeText: { color: colors.primaryPressed, fontSize: 10, fontWeight: '900' },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  momentSection: { backgroundColor: colors.butterSoft },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  sectionIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  optional: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  fieldHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  inlineFields: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  unit: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
  explainer: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.md,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    padding: spacing.md,
  },
  notesInput: { minHeight: 92 },
  privacyNotice: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  privacyIcon: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  privacyCopy: { flex: 1, gap: spacing.xs },
  privacyTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  privacyText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonPressed: { backgroundColor: colors.coralPressed },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  retryButton: { marginTop: spacing.md, minWidth: 220 },
  stateScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    maxWidth: 360,
    textAlign: 'center',
  },
  reviewNotice: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  reviewNoticeSuccess: { backgroundColor: colors.aquaSoft },
  reviewNoticeError: { borderColor: colors.error, borderWidth: 1 },
  reviewMark: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  reviewMarkSuccess: { backgroundColor: colors.primary },
  reviewMarkText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  reviewMarkTextSuccess: { fontSize: 18 },
  reviewCopy: { flex: 1 },
  reviewTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  reviewText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  accessSection: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.xl,
  },
  accessTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  accessText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  accessLink: {
    color: colors.primaryPressed,
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: spacing.xs,
  },
  destructiveLink: { color: colors.error },
  confirmationCard: {
    backgroundColor: colors.peach,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  confirmationTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  confirmationText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  confirmationActions: { flexDirection: 'row', gap: spacing.sm },
  confirmationCancel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmationCancelText: { color: colors.textMuted, fontWeight: '800' },
  confirmationAccept: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  confirmationAcceptText: { color: colors.white, fontWeight: '900' },
  accessError: { color: colors.error, fontSize: 12 },
});
