import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectField } from '@/features/baby-profile/presentation/select-field';
import type {
  FamilyBabyGroup,
  FamilyBabySummary,
} from '@/features/family/domain/family-baby-context';
import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { colors, radius, spacing } from '@/shared/presentation/theme';

interface FamilyBabySwitcherProps {
  activeBaby?: FamilyBabySummary;
  activeFamily: FamilyBabyGroup;
  families: FamilyBabyGroup[];
  isCreatingBaby: boolean;
  onAddBaby: () => void;
  onChangeBaby: (babyId: string) => void;
  onChangeFamily: (familyId: string) => void;
}

export function FamilyBabySwitcher({
  activeBaby,
  activeFamily,
  families,
  isCreatingBaby,
  onAddBaby,
  onChangeBaby,
  onChangeFamily,
}: FamilyBabySwitcherProps) {
  const familyOptions = families.map((family) => ({
    label: family.name,
    supportingText: `${family.babies.length} ${
      family.babies.length === 1 ? 'bebé' : 'bebés'
    }`,
    value: family.id,
  }));
  const babyOptions = activeFamily.babies.map((baby) => ({
    label: baby.name,
    supportingText:
      baby.lifeStage === 'expected' ? 'Aún por nacer' : 'Ya nació',
    value: baby.id,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.selectors}>
        <View style={styles.selector}>
          <SelectField
            eyebrow="CONTEXTO FAMILIAR"
            label="Familia activa"
            onChange={onChangeFamily}
            options={familyOptions}
            placeholder="Selecciona una familia"
            title="Cambiar de familia"
            value={activeFamily.id}
          />
        </View>
        <View style={styles.selector}>
          <SelectField
            eyebrow="CONTEXTO FAMILIAR"
            label="Bebé activo"
            onChange={onChangeBaby}
            options={babyOptions}
            placeholder={isCreatingBaby ? 'Creando un nuevo perfil' : 'Sin bebés'}
            title="Cambiar de bebé"
            value={isCreatingBaby ? undefined : activeBaby?.id}
          />
        </View>
      </View>
      {activeFamily.role === 'owner' || activeFamily.role === 'admin' ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAddBaby}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Text style={styles.addGlyph}>＋</Text>
          <Text style={styles.addLabel}>Añadir bebé</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function FamilyBabyContextErrorScreen({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.errorScreen}>
        <NuniMascot size={160} />
        <Text style={styles.errorTitle}>No pudimos preparar tu familia</Text>
        <Text style={styles.errorText}>
          Tus datos siguen seguros. Comprueba la conexión y vuelve a intentarlo.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Text style={styles.retryLabel}>Volver a intentar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  errorScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
    maxWidth: 420,
    textAlign: 'center',
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  retryLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
  },
  container: {
    alignItems: 'flex-end',
    backgroundColor: colors.sky,
    borderRadius: radius.lg,
    gap: spacing.md,
    padding: spacing.md,
  },
  selectors: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  selector: {
    flex: 1,
    minWidth: 220,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  addButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  addGlyph: {
    color: colors.coral,
    fontSize: 18,
    fontWeight: '900',
  },
  addLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
});
