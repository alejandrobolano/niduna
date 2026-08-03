import { ChevronDown, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const [isOpen, setIsOpen] = useState(false);
  const familyOptions = families.map((family) => ({
    label: family.name,
    supportingText: `${family.babies.length} ${
      family.babies.length === 1 ? 'bebé seguido' : 'bebés seguidos'
    }`,
    value: family.id,
  }));
  const babyOptions = activeFamily.babies.map((baby) => ({
    label: baby.name,
    supportingText:
      baby.lifeStage === 'expected' ? 'Aún por nacer' : 'Ya nació',
    value: baby.id,
  }));
  const initial = (activeBaby?.name ?? activeFamily.name)
    .slice(0, 1)
    .toUpperCase();

  function changeFamily(familyId: string) {
    onChangeFamily(familyId);
    setIsOpen(false);
  }

  function changeBaby(babyId: string) {
    onChangeBaby(babyId);
    setIsOpen(false);
  }

  function addBaby() {
    setIsOpen(false);
    onAddBaby();
  }

  return (
    <>
      <Pressable
        accessibilityLabel={`Cambiar contexto. ${activeBaby?.name ?? 'Sin bebé activo'}, ${activeFamily.name}`}
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.contextButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <View style={styles.contextAvatar}>
          <Text style={styles.contextAvatarText}>{initial}</Text>
        </View>
        <View style={styles.contextCopy}>
          <Text numberOfLines={1} style={styles.contextName}>
            {isCreatingBaby
              ? 'Nuevo bebé'
              : (activeBaby?.name ?? 'Elegir bebé')}
          </Text>
          <Text numberOfLines={1} style={styles.contextFamily}>
            {activeFamily.name}
          </Text>
        </View>
        <ChevronDown color={colors.coral} size={18} />
      </Pressable>
      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Cerrar selector de familia y bebé"
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={styles.backdrop}
          />
          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <View>
                <Text style={styles.panelEyebrow}>CONTEXTO ACTIVO</Text>
                <Text style={styles.panelTitle}>Familia y bebé</Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                <X color={colors.text} size={20} />
              </Pressable>
            </View>
            <Text style={styles.panelText}>
              Los nuevos registros se guardarán en el bebé que selecciones aquí.
            </Text>
            <SelectField
              eyebrow="CONTEXTO FAMILIAR"
              label="Familia activa"
              onChange={changeFamily}
              options={familyOptions}
              placeholder="Selecciona una familia"
              title="Cambiar de familia"
              value={activeFamily.id}
            />
            <SelectField
              eyebrow="CONTEXTO FAMILIAR"
              label="Bebé activo"
              onChange={changeBaby}
              options={babyOptions}
              placeholder={
                isCreatingBaby ? 'Creando un nuevo perfil' : 'Sin bebés seguidos'
              }
              title="Cambiar de bebé"
              value={isCreatingBaby ? undefined : activeBaby?.id}
            />
            {activeFamily.role === 'owner' || activeFamily.role === 'admin' ? (
              <Pressable
                accessibilityRole="button"
                onPress={addBaby}
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Plus color={colors.coral} size={18} />
                <Text style={styles.addLabel}>Añadir bebé</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
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
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.retryLabel}>Volver a intentar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
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
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.xl,
  },
  retryLabel: { color: colors.white, fontSize: 15, fontWeight: '900' },
  contextButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    maxWidth: 230,
    minHeight: 48,
    minWidth: 160,
    paddingHorizontal: spacing.sm,
  },
  contextAvatar: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: radius.md,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  contextAvatarText: { color: colors.coral, fontSize: 13, fontWeight: '900' },
  contextCopy: { flex: 1 },
  contextName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  contextFamily: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  modalRoot: { flex: 1 },
  backdrop: {
    backgroundColor: 'rgba(25, 31, 52, 0.28)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  panel: {
    alignSelf: 'flex-end',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.xl,
    maxWidth: 420,
    padding: spacing.xl,
    width: '92%',
  },
  panelHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelEyebrow: {
    color: colors.coral,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.7,
    marginTop: spacing.xs,
  },
  panelText: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 50,
  },
  addLabel: { color: colors.text, fontSize: 13, fontWeight: '900' },
});
