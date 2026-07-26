import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { validateBabyProfile } from '@/features/baby-profile/application/validate-baby-profile';
import type {
  BabyLifeStage,
  BabyProfile,
  SexAtBirth,
} from '@/features/baby-profile/domain/baby-profile';
import { ProfileField } from '@/features/baby-profile/presentation/profile-field';
import { SegmentedControl } from '@/features/baby-profile/presentation/segmented-control';
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

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const number = Number(value.replace(',', '.'));
  return Number.isFinite(number) ? number : undefined;
}

export function BabyProfileScreen() {
  const [lifeStage, setLifeStage] = useState<BabyLifeStage>('expected');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [sexAtBirth, setSexAtBirth] = useState<SexAtBirth>('female');
  const [gestationalWeeks, setGestationalWeeks] = useState('');
  const [gestationalDays, setGestationalDays] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [lengthCentimeters, setLengthCentimeters] = useState('');
  const [headCircumference, setHeadCircumference] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [notes, setNotes] = useState('');

  const profile = useMemo<BabyProfile>(
    () => ({
      lifeStage,
      name,
      expectedDueDate: lifeStage === 'expected' ? date : undefined,
      birthDate: lifeStage === 'born' ? date : undefined,
      sexAtBirth,
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
    }),
    [
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

  function handleSave() {
    const errors = validateBabyProfile(profile);
    if (errors.length > 0) {
      Alert.alert('Revisa los datos', errors[0].message);
      return;
    }

    Alert.alert('Perfil preparado', 'Conectaremos el guardado familiar en el siguiente paso.');
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
          <View style={styles.header}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>N</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>NIDUNA</Text>
              <Text style={styles.title}>Perfil del bebé</Text>
              <Text style={styles.subtitle}>
                Los datos importantes, disponibles para quienes cuidan.
              </Text>
            </View>
          </View>

          <View style={styles.photoCard}>
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoGlyph}>♡</Text>
            </View>
            <View style={styles.photoCopy}>
              <Text style={styles.photoTitle}>Añadir una foto</Text>
              <Text style={styles.photoHint}>Solo la verá la familia autorizada.</Text>
            </View>
            <Pressable accessibilityRole="button" style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Elegir</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Momento</Text>
            <SegmentedControl
              onChange={(value) => {
                setLifeStage(value);
                setDate('');
              }}
              options={lifeStageOptions}
              value={lifeStage}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datos principales</Text>
            <ProfileField
              autoCapitalize="words"
              label="Nombre"
              onChangeText={setName}
              placeholder="Nombre del bebé"
              value={name}
            />
            <ProfileField
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              label={lifeStage === 'expected' ? 'Fecha probable de parto' : 'Fecha de nacimiento'}
              onChangeText={setDate}
              placeholder="AAAA-MM-DD"
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
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Gestación</Text>
              <Text style={styles.optional}>Opcional</Text>
            </View>
            <View style={styles.inlineFields}>
              <ProfileField
                keyboardType="number-pad"
                label="Semanas"
                maxLength={2}
                onChangeText={setGestationalWeeks}
                placeholder="40"
                value={gestationalWeeks}
              />
              <ProfileField
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
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Medidas al nacer</Text>
                <Text style={styles.optional}>Opcional</Text>
              </View>
              <ProfileField
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
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Información de salud</Text>
              <Text style={styles.optional}>Opcional</Text>
            </View>
            <ProfileField
              autoCapitalize="characters"
              hint="No lo deduzcas. Déjalo vacío si no aparece en documentación clínica."
              label="Grupo sanguíneo y Rh"
              onChangeText={setBloodGroup}
              placeholder="Ej. A+"
              value={bloodGroup}
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
            <Text style={styles.privacyTitle}>Privado para tu familia</Text>
            <Text style={styles.privacyText}>
              Cada persona necesitará una invitación y tendrá permisos propios.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleSave}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          >
            <Text style={styles.primaryButtonText}>Guardar perfil</Text>
          </Pressable>
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
    paddingTop: spacing.xl,
    width: '100%',
  },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.lg },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  brandMarkText: { color: colors.white, fontSize: 28, fontWeight: '800' },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 21, marginTop: spacing.xs },
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
  photoGlyph: { color: colors.text, fontSize: 25 },
  photoCopy: { flex: 1 },
  photoTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  photoHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  secondaryButton: {
    borderColor: colors.primary,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  optional: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  fieldHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  inlineFields: { flexDirection: 'row', gap: spacing.md },
  unit: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  explainer: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    padding: spacing.md,
  },
  notesInput: { minHeight: 92 },
  privacyNotice: {
    backgroundColor: colors.lavender,
    borderRadius: radius.lg,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  privacyTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  privacyText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonPressed: { backgroundColor: colors.primaryPressed },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
