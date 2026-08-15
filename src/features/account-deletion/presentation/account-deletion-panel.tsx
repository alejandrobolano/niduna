import { ShieldAlert, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  AccountDeletionError,
  type AccountDeletionRepository,
} from '@/features/account-deletion/application/account-deletion-repository';
import { AuthFailure, isValidOtp, normalizeOtp } from '@/features/auth/domain/auth';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';
import { colors, radius, spacing } from '@/shared/presentation/theme';

type DeletionMode = 'account' | 'ownedFamilies';
type Dialog = 'code' | 'familyWarning' | 'ownerChoice' | 'warning' | undefined;

interface AccountDeletionPanelProps {
  email: string;
  ownedFamilyNames: string[];
  repository: AccountDeletionRepository;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof AuthFailure) {
    if (error.code === 'invalid_code') {
      return 'El código no es válido o ha caducado.';
    }

    if (error.code === 'rate_limited') {
      return 'Has realizado demasiados intentos. Espera unos minutos.';
    }

    if (error.code === 'network' || error.code === 'service_unavailable') {
      return 'No pudimos conectar con el servicio. Revisa la conexión.';
    }
  }

  if (error instanceof AccountDeletionError) {
    if (error.reason === 'owner_transfer_required') {
      return 'Sigues siendo propietario de una familia. Transfiere primero su propiedad.';
    }

    if (error.reason === 'recent_authentication_required') {
      return 'La verificación ha caducado. Solicita un código nuevo.';
    }

    if (error.reason === 'network') {
      return 'No pudimos conectar con el servicio. Revisa la conexión.';
    }
  }

  return 'No pudimos eliminar la cuenta. Tus datos siguen protegidos; inténtalo de nuevo.';
}

export function AccountDeletionPanel({
  email,
  ownedFamilyNames,
  repository,
}: AccountDeletionPanelProps) {
  const { requestEmailCode, signOut, verifyEmailCode } = useAuth();
  const [code, setCode] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [deletionMode, setDeletionMode] = useState<DeletionMode>('account');
  const [dialog, setDialog] = useState<Dialog>();
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  function closeDialog() {
    if (isPending) {
      return;
    }

    setCode('');
    setConfirmationText('');
    setDeletionMode('account');
    setDialog(undefined);
    setError(undefined);
  }

  function openDialog() {
    setError(undefined);
    setDeletionMode('account');
    setDialog(ownedFamilyNames.length > 0 ? 'ownerChoice' : 'warning');
  }

  function openFamilyDeletionWarning() {
    setError(undefined);
    setDeletionMode('ownedFamilies');
    setDialog('familyWarning');
  }

  async function requestConfirmationCode() {
    setError(undefined);
    setIsPending(true);

    try {
      await requestEmailCode(email, { allowCreate: false });
      setDialog('code');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  async function deleteAccount() {
    if (!isValidOtp(code)) {
      setError('Introduce los 8 dígitos del código recibido por correo.');
      return;
    }

    setError(undefined);
    setIsPending(true);

    try {
      await verifyEmailCode(email, code);
      await repository.deleteAccount({
        deleteOwnedFamilies: deletionMode === 'ownedFamilies',
      });
      await signOut().catch(() => undefined);
      setDialog(undefined);
    } catch (deletionError) {
      setError(getErrorMessage(deletionError));
    } finally {
      setIsPending(false);
    }
  }

  const ownedFamilies = ownedFamilyNames.join(', ');
  const deletesOwnedFamilies = deletionMode === 'ownedFamilies';

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        onPress={openDialog}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      >
        <Trash2 color={colors.textMuted} size={13} />
        <Text style={styles.linkText}>Eliminar mi cuenta</Text>
      </Pressable>

      <ConfirmationModal
        confirmLabel="Enviar código"
        description="Perderás el acceso a Niduna y tus datos personales se eliminarán. Los cuidados compartidos se conservarán sin identificarte para no romper el historial familiar."
        eyebrow="ACCIÓN IRREVERSIBLE"
        icon={<ShieldAlert color={colors.error} size={24} />}
        isPending={isPending}
        onCancel={closeDialog}
        onConfirm={() => void requestConfirmationCode()}
        title="¿Eliminar tu cuenta?"
        tone="danger"
        visible={dialog === 'warning'}
      >
        <Text style={styles.notice}>
          La descarga de una copia completa aún no está disponible. No continúes si necesitas guardar tus datos antes de eliminar la cuenta.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ConfirmationModal>

      <ConfirmationModal
        cancelLabel="Conservar"
        confirmLabel="Eliminar familias y cuenta"
        description={`Eres propietario de ${ownedFamilyNames.length === 1 ? 'esta familia' : 'estas familias'}: ${ownedFamilies}. Puedes conservarlas transfiriendo su propiedad o eliminarlas definitivamente junto con tu cuenta.`}
        eyebrow="ELIGE QUÉ HACER"
        icon={<ShieldAlert color={colors.error} size={24} />}
        onCancel={closeDialog}
        onConfirm={openFamilyDeletionWarning}
        title="También administras datos familiares"
        tone="danger"
        visible={dialog === 'ownerChoice'}
      >
        <Text style={styles.notice}>
          Para conservarlas, cierra este aviso y usa Familia → Personas con acceso → Transferir propiedad.
        </Text>
      </ConfirmationModal>

      <ConfirmationModal
        confirmLabel="Continuar"
        description="Se borrarán de forma irreversible todos los bebés, registros, fotos, historias, invitaciones y accesos de las familias que posees. Las demás familias no se eliminarán."
        eyebrow="BORRADO TOTAL"
        icon={<Trash2 color={colors.error} size={24} />}
        isPending={isPending}
        onCancel={closeDialog}
        onConfirm={() => {
          if (confirmationText.trim().toUpperCase() !== 'ELIMINAR') {
            setError('Escribe ELIMINAR para continuar.');
            return;
          }

          void requestConfirmationCode();
        }}
        title="¿Eliminar familias y cuenta?"
        tone="danger"
        visible={dialog === 'familyWarning'}
      >
        <Text style={styles.familyNames}>{ownedFamilies}</Text>
        <TextInput
          autoCapitalize="characters"
          onChangeText={setConfirmationText}
          placeholder="Escribe ELIMINAR"
          placeholderTextColor={colors.textMuted}
          style={styles.confirmationInput}
          value={confirmationText}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ConfirmationModal>

      <ConfirmationModal
        confirmLabel={deletesOwnedFamilies ? 'Eliminar todo definitivamente' : 'Eliminar definitivamente'}
        description={`Hemos enviado un código de 8 dígitos a ${email}. Escríbelo para confirmar que eres tú.`}
        eyebrow="VERIFICA TU IDENTIDAD"
        icon={<Trash2 color={colors.error} size={24} />}
        isPending={isPending}
        onCancel={closeDialog}
        onConfirm={() => void deleteAccount()}
        title="Último paso"
        tone="danger"
        visible={dialog === 'code'}
      >
        <TextInput
          accessibilityLabel="Código de seguridad"
          autoComplete="one-time-code"
          inputMode="numeric"
          maxLength={8}
          onChangeText={(value) => setCode(normalizeOtp(value))}
          placeholder="00000000"
          placeholderTextColor={colors.textMuted}
          style={styles.codeInput}
          value={code}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ConfirmationModal>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'flex-start' },
  link: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 28,
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  notice: {
    backgroundColor: colors.peach,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
    padding: spacing.md,
  },
  codeInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 5,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },
  confirmationInput: {
    backgroundColor: colors.background,
    borderColor: colors.error,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },
  familyNames: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  error: { color: colors.error, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.68 },
});
