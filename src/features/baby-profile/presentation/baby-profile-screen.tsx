import {
  Camera,
  FileText,
  Heart,
  HeartHandshake,
  MapPinned,
  MoveVertical,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BabyProfileRepository } from '@/features/baby-profile/application/baby-profile-repository';
import {
  BabyPhotoError,
  type BabyPhotoRepository,
} from '@/features/baby-profile/application/baby-photo-repository';
import {
  formatBloodType,
  parseBloodType,
  type BloodTypeSelection,
} from '@/features/baby-profile/application/parse-blood-type';
import { validateBabyProfile } from '@/features/baby-profile/application/validate-baby-profile';
import { pickAndPrepareBabyPhoto } from '@/features/baby-profile/infrastructure/baby-photo-image-picker';
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
import {
  formatGramsAsKilogramsInput,
  parseKilogramsToGrams,
} from '@/shared/domain/weight';
import { dateToIso } from '@/shared/presentation/date';
import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

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
  babyPhotoRepository: BabyPhotoRepository;
  canManageBabies?: boolean;
  familyId: string;
  onArchive?: () => Promise<void>;
  onPhotoChanged?: () => Promise<void> | void;
  onOpenDocuments?: () => void;
  onOpenContacts?: () => void;
  onSaved?: (babyId: string) => void;
  onUnfollow?: () => Promise<void>;
  repository: BabyProfileRepository;
  topContent?: ReactNode;
}

export function BabyProfileScreen({
  babyId: selectedBabyId,
  babyPhotoRepository,
  canManageBabies = false,
  familyId,
  onArchive,
  onPhotoChanged,
  onOpenDocuments,
  onOpenContacts,
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
  const [weightKilograms, setWeightKilograms] = useState('');
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
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [isPhotoLoading, setIsPhotoLoading] = useState(Boolean(selectedBabyId));
  const [isPhotoSaving, setIsPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string>();
  const [isConfirmingPhotoRemoval, setIsConfirmingPhotoRemoval] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const isReadOnly = !canManageBabies;
  const parsedWeightGrams = parseKilogramsToGrams(
    weightKilograms,
    0.3,
    7,
  );
  const weightInputIsInvalid =
    Boolean(weightKilograms.trim()) && parsedWeightGrams === undefined;

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
        setWeightKilograms(
          formatGramsAsKilogramsInput(measurement?.weightGrams),
        );
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

  useEffect(() => {
    let active = true;

    if (!selectedBabyId) {
      return () => {
        active = false;
      };
    }

    void babyPhotoRepository
      .load(selectedBabyId)
      .then((url) => {
        if (active) {
          setPhotoUrl(url);
        }
      })
      .catch(() => {
        if (active) {
          setPhotoError('No pudimos cargar la foto. Inténtalo de nuevo.');
        }
      })
      .finally(() => {
        if (active) {
          setIsPhotoLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [babyPhotoRepository, selectedBabyId]);

  async function handlePickPhoto() {
    if (!storedBabyId) {
      setPhotoError('Guarda primero el perfil para poder añadir la foto.');
      return;
    }

    setIsPhotoSaving(true);
    setPhotoError(undefined);

    try {
      const image = await pickAndPrepareBabyPhoto();

      if (!image) {
        return;
      }

      const url = await babyPhotoRepository.replace({
        babyId: storedBabyId,
        familyId,
        image,
      });
      setPhotoUrl(url);
      void onPhotoChanged?.();
    } catch (error) {
      const message =
        error instanceof BabyPhotoError && error.code === 'not_allowed'
          ? 'Necesitamos permiso para acceder a tus fotos.'
          : error instanceof BabyPhotoError && error.code === 'invalid_image'
            ? 'Elige una imagen JPG, PNG o WebP de hasta 10 MB.'
            : 'No pudimos guardar la foto. Comprueba la conexión e inténtalo de nuevo.';
      setPhotoError(message);
    } finally {
      setIsPhotoSaving(false);
    }
  }

  async function handleRemovePhoto() {
    if (!storedBabyId) {
      return;
    }

    setIsPhotoSaving(true);
    setPhotoError(undefined);

    try {
      await babyPhotoRepository.remove(storedBabyId);
      setPhotoUrl(undefined);
      setIsConfirmingPhotoRemoval(false);
      void onPhotoChanged?.();
    } catch {
      setPhotoError('No pudimos retirar la foto. Inténtalo de nuevo.');
    } finally {
      setIsPhotoSaving(false);
    }
  }

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
                weightGrams: parsedWeightGrams,
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
      parsedWeightGrams,
      sexAtBirth,
    ],
  );

  const validationErrors = useMemo(
    () => {
      if (!hasReviewed) {
        return [];
      }

      const errors = validateBabyProfile(profile);

      if (weightInputIsInvalid) {
        errors.push({
          field: 'birthMeasurement',
          message: 'El peso debe estar entre 0,3 y 7 kg.',
        });
      }

      return errors;
    },
    [hasReviewed, profile, weightInputIsInvalid],
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
            <View style={styles.photoMain}>
              <Pressable
                accessibilityLabel={photoUrl ? `Ampliar foto de ${name || 'bebé'}` : undefined}
                accessibilityRole={photoUrl ? 'button' : undefined}
                disabled={!photoUrl}
                onPress={() => setIsPhotoViewerOpen(true)}
                style={({ pressed }) => [
                  styles.photoPlaceholder,
                  pressed && photoUrl && styles.photoActionPressed,
                ]}
              >
                {photoUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: photoUrl }}
                    style={styles.photoImage}
                    transition={180}
                  />
                ) : (
                  <Heart color={colors.coral} size={24} />
                )}
              </Pressable>
              <View style={styles.photoCopy}>
                <Text style={styles.photoTitle}>Foto del bebé</Text>
                <Text style={styles.photoHint}>
                  {isPhotoLoading
                    ? 'Cargando la foto privada…'
                    : 'Solo las personas autorizadas de la familia pueden verla.'}
                </Text>
                {canManageBabies ? (
                  <View style={styles.photoActions}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isPhotoSaving || !storedBabyId}
                      onPress={() => void handlePickPhoto()}
                      style={({ pressed }) => [
                        styles.photoAction,
                        pressed && styles.photoActionPressed,
                        (isPhotoSaving || !storedBabyId) && styles.photoActionDisabled,
                      ]}
                    >
                      <Camera color={colors.primaryPressed} size={16} />
                      <Text style={styles.photoActionText}>
                        {isPhotoSaving
                          ? 'Actualizando…'
                          : photoUrl
                            ? 'Cambiar foto'
                            : 'Añadir foto'}
                      </Text>
                    </Pressable>
                    {photoUrl ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={isPhotoSaving}
                        onPress={() => setIsConfirmingPhotoRemoval(true)}
                        style={({ pressed }) => [
                          styles.photoRemoveAction,
                          pressed && styles.photoActionPressed,
                        ]}
                      >
                        <Trash2 color={colors.error} size={15} />
                        <Text style={styles.photoRemoveText}>Retirar foto</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {canManageBabies && !storedBabyId ? (
                  <Text style={styles.photoSaveFirst}>
                    Guarda el perfil antes de añadir una foto.
                  </Text>
                ) : null}
              </View>
              <View style={styles.privateBadge}>
                <Text style={styles.privateBadgeText}>PRIVADA</Text>
              </View>
            </View>
            {isConfirmingPhotoRemoval ? (
              <View style={styles.photoConfirmation}>
                <Text style={styles.confirmationTitle}>¿Retirar esta foto?</Text>
                <Text style={styles.confirmationText}>
                  Dejará de estar disponible para toda la familia. Podrás añadir otra cuando quieras.
                </Text>
                <View style={styles.confirmationActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isPhotoSaving}
                    onPress={() => setIsConfirmingPhotoRemoval(false)}
                    style={styles.confirmationCancel}
                  >
                    <Text style={styles.confirmationCancelText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isPhotoSaving}
                    onPress={() => void handleRemovePhoto()}
                    style={styles.confirmationAccept}
                  >
                    <Text style={styles.confirmationAcceptText}>
                      {isPhotoSaving ? 'Retirando…' : 'Retirar foto'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {photoError ? (
              <Text accessibilityLiveRegion="polite" style={styles.photoError}>
                {photoError}
              </Text>
            ) : null}
          </View>

          {storedBabyId && onOpenDocuments ? (
            <Pressable
              accessibilityHint="Abre los documentos privados del bebé"
              accessibilityRole="button"
              onPress={onOpenDocuments}
              style={({ pressed }) => [
                styles.documentsCard,
                pressed && styles.photoActionPressed,
              ]}
            >
              <View style={styles.documentsIcon}>
                <FileText color={colors.primaryPressed} size={24} />
              </View>
              <View style={styles.photoCopy}>
                <Text style={styles.photoTitle}>Documentos del bebé</Text>
                <Text style={styles.photoHint}>
                  Guarda informes, autorizaciones y carnets para toda la familia.
                </Text>
              </View>
              <Text style={styles.documentsLink}>Abrir</Text>
            </Pressable>
          ) : null}

          {storedBabyId && onOpenContacts ? (
            <Pressable
              accessibilityHint="Abre los contactos y lugares importantes del bebé"
              accessibilityRole="button"
              onPress={onOpenContacts}
              style={({ pressed }) => [
                styles.documentsCard,
                pressed && styles.photoActionPressed,
              ]}
            >
              <View style={styles.documentsIcon}>
                <MapPinned color={colors.primaryPressed} size={24} />
              </View>
              <View style={styles.photoCopy}>
                <Text style={styles.photoTitle}>Contactos importantes</Text>
                <Text style={styles.photoHint}>
                  Pediatra, hospital, farmacia y otros lugares útiles.
                </Text>
              </View>
              <Text style={styles.documentsLink}>Abrir</Text>
            </Pressable>
          ) : null}

          <View style={[styles.section, styles.momentSection]}>
            <SectionHeading accent={colors.butter} icon={Sun} title="Momento" />
            <SegmentedControl
              disabled={isReadOnly}
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
              disabled={isReadOnly}
              error={getError('name')}
              label="Nombre"
              onChangeText={setName}
              placeholder="Nombre del bebé"
              value={name}
            />
            <DatePickerField
              disabled={isReadOnly}
              error={getError(lifeStage === 'expected' ? 'expectedDueDate' : 'birthDate')}
              label={lifeStage === 'expected' ? 'Fecha probable de parto' : 'Fecha de nacimiento'}
              maximumDate={lifeStage === 'born' ? dateToIso(new Date()) : undefined}
              onChange={setDate}
              value={date}
            />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Sexo registrado al nacer</Text>
              <SegmentedControl
                disabled={isReadOnly}
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
                disabled={isReadOnly}
                error={getError('gestationalAgeWeeks')}
                keyboardType="number-pad"
                label="Semanas"
                maxLength={2}
                onChangeText={setGestationalWeeks}
                placeholder="40"
                value={gestationalWeeks}
              />
              <ProfileField
                disabled={isReadOnly}
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
                disabled={isReadOnly}
                error={getError('birthMeasurement')}
                keyboardType="decimal-pad"
                label="Peso"
                onChangeText={setWeightKilograms}
                placeholder="Ej. 3,250"
                trailing={<Text style={styles.unit}>kg</Text>}
                value={weightKilograms}
              />
              <View style={styles.inlineFields}>
                <ProfileField
                  disabled={isReadOnly}
                  keyboardType="decimal-pad"
                  label="Longitud"
                  onChangeText={setLengthCentimeters}
                  placeholder="50"
                  trailing={<Text style={styles.unit}>cm</Text>}
                  value={lengthCentimeters}
                />
                <ProfileField
                  disabled={isReadOnly}
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
              disabled={isReadOnly}
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
              disabled={isReadOnly}
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
            disabled={isSaving || isReadOnly || (!hasUnsavedChanges && Boolean(storedBabyId))}
            onPress={() => void handleSave()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              (isSaving || isReadOnly || (!hasUnsavedChanges && Boolean(storedBabyId))) &&
                styles.primaryButtonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isSaving
                ? 'Guardando…'
                : isReadOnly
                  ? 'Sin permisos para editar'
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
                Puedes ocultar este perfil sólo para ti. 
                {canManageBabies && (
                  <Text>
                    Como administrador/a de la
                    familia, también puedes retirarlo para todos sin borrar su
                    historial.
                  </Text>
                )}
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
              {canManageBabies && onArchive ? (
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
      <Modal
        animationType="fade"
        onRequestClose={() => setIsPhotoViewerOpen(false)}
        transparent
        visible={isPhotoViewerOpen && Boolean(photoUrl)}
      >
        <View style={styles.photoViewerRoot}>
          <Pressable
            accessibilityLabel="Cerrar foto ampliada"
            accessibilityRole="button"
            onPress={() => setIsPhotoViewerOpen(false)}
            style={styles.photoViewerBackdrop}
          />
          <SafeAreaView pointerEvents="box-none" style={styles.photoViewerSafeArea}>
            <View style={styles.photoViewerHeader}>
              <View>
                <Text style={styles.photoViewerEyebrow}>FOTO PRIVADA</Text>
                <Text style={styles.photoViewerTitle}>{name || 'Bebé'}</Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                onPress={() => setIsPhotoViewerOpen(false)}
                style={({ pressed }) => [
                  styles.photoViewerClose,
                  pressed && styles.photoViewerClosePressed,
                ]}
              >
                <X color={colors.white} size={25} />
              </Pressable>
            </View>
            {photoUrl ? (
              <Image
                accessibilityLabel={`Foto ampliada de ${name || 'bebé'}`}
                contentFit="contain"
                source={{ uri: photoUrl }}
                style={styles.photoViewerImage}
                transition={180}
              />
            ) : null}
            <Text style={styles.photoViewerPrivacy}>
              Solo las personas autorizadas de la familia pueden verla.
            </Text>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  flex: { flex: 1 },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: {
    alignSelf: 'center',
    gap: spacing.xl,
    maxWidth: 920,
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  photoMain: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: radius.pill,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56,
  },
  photoImage: { height: '100%', width: '100%' },
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
  photoActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  photoAction: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  photoActionPressed: { opacity: 0.7 },
  photoActionDisabled: { opacity: 0.5 },
  photoActionText: { color: colors.primaryPressed, fontSize: 12, fontWeight: '900' },
  photoRemoveAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  photoRemoveText: { color: colors.error, fontSize: 12, fontWeight: '800' },
  photoSaveFirst: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm },
  photoConfirmation: {
    backgroundColor: colors.peach,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  photoError: { color: colors.error, fontSize: 12, lineHeight: 17 },
  documentsCard: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 82,
    padding: spacing.lg,
  },
  documentsIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  documentsLink: {
    color: colors.primaryPressed,
    fontSize: 13,
    fontWeight: '900',
  },
  photoViewerRoot: {
    backgroundColor: 'rgba(12, 18, 40, 0.96)',
    flex: 1,
  },
  photoViewerBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  photoViewerSafeArea: {
    flex: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  photoViewerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoViewerEyebrow: {
    color: colors.aqua,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  photoViewerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  photoViewerClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  photoViewerClosePressed: { backgroundColor: 'rgba(255, 255, 255, 0.24)' },
  photoViewerImage: { flex: 1, width: '100%' },
  photoViewerPrivacy: {
    color: colors.white,
    fontSize: 12,
    opacity: 0.76,
    paddingBottom: spacing.sm,
    textAlign: 'center',
  },
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
    backgroundColor: colors.surface,
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
  primaryButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '900' },
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
  reviewMarkText: { color: colors.onAccent, fontSize: 14, fontWeight: '900' },
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
  confirmationAcceptText: { color: colors.onAccent, fontWeight: '900' },
  accessError: { color: colors.error, fontSize: 12 },
}));
