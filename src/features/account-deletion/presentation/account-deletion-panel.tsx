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

type Dialog = 'blocked' | 'code' | 'warning' | undefined;

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
  const [dialog, setDialog] = useState<Dialog>();
  const [error, setError] = useState<string>();
  const [isPending, setIsPending] = useState(false);

  function closeDialog() {
    if (isPending) {
      return;
    }

    setCode('');
    setDialog(undefined);
    setError(undefined);
  }

  function openDialog() {
    setError(undefined);
    setDialog(ownedFamilyNames.length > 0 ? 'blocked' : 'warning');
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
      await repository.deleteAccount();
      await signOut().catch(() => undefined);
      setDialog(undefined);
    } catch (deletionError) {
      setError(getErrorMessage(deletionError));
    } finally {
      setIsPending(false);
    }
  }

  const ownedFamilies = ownedFamilyNames.join(', ');

  return (
    <View style={styles.section}>
      <View style={styles.copy}>
        <Text style={styles.title}>Eliminar cuenta</Text>
        <Text style={styles.description}>
          Borra tu acceso y tus datos personales de Niduna de forma irreversible.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={openDialog}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}
      >
        <Trash2 color={colors.error} size={16} />
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
        confirmLabel="Eliminar definitivamente"
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

      <ConfirmationModal
        cancelLabel="Cerrar"
        confirmLabel="Entendido"
        description={`Antes debes transferir la propiedad desde Familia → Personas con acceso en ${ownedFamilyNames.length === 1 ? 'esta familia' : 'estas familias'}: ${ownedFamilies}.`}
        eyebrow="PROPIEDAD PENDIENTE"
        icon={<ShieldAlert color={colors.primaryPressed} size={24} />}
        onCancel={closeDialog}
        onConfirm={closeDialog}
        title="Tu familia necesita un propietario"
        visible={dialog === 'blocked'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  copy: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 14, fontWeight: '900' },
  description: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  link: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 40,
  },
  linkText: { color: colors.error, fontSize: 13, fontWeight: '900' },
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
  error: { color: colors.error, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.68 },
});
