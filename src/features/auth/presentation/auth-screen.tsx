import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthFailure,
  isValidEmail,
  isValidOtp,
  normalizeEmail,
  normalizeOtp,
} from '@/features/auth/domain/auth';
import { useAuth } from '@/features/auth/presentation/auth-provider';
import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { colors, radius, spacing } from '@/shared/presentation/theme';

type AuthStep = 'email' | 'code';

function getFailureMessage(error: unknown): string {
  if (!(error instanceof AuthFailure)) {
    return 'No pudimos completar el acceso. Inténtalo de nuevo.';
  }

  switch (error.code) {
    case 'invalid_code':
      return 'El código no es válido o ya caducó. Solicita uno nuevo.';
    case 'rate_limited':
      return 'Espera un momento antes de solicitar otro código.';
    case 'network':
      return 'No hay conexión con el servicio. Revisa internet e inténtalo de nuevo.';
    default:
      return 'No pudimos completar el acceso. Inténtalo de nuevo.';
  }
}

export function AuthScreen() {
  const { requestEmailCode, verifyEmailCode } = useAuth();
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearTimeout(timeout);
  }, [resendSeconds]);

  async function sendCode() {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError('Escribe un correo válido para recibir el código.');
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      await requestEmailCode(normalizedEmail);
      setEmail(normalizedEmail);
      setCode('');
      setStep('code');
      setResendSeconds(60);
    } catch (requestError) {
      setError(getFailureMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyCode() {
    if (!isValidOtp(code)) {
      setError('Introduce los seis números del código.');
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      await verifyEmailCode(email, code);
    } catch (verificationError) {
      setError(getFailureMessage(verificationError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeEmail() {
    setStep('email');
    setCode('');
    setError(undefined);
    setResendSeconds(0);
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
          <View style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroCopy}>
              <Text style={styles.brand}>NIDUNA</Text>
              <Text style={styles.title}>
                {step === 'email' ? 'Tu familia, siempre al día' : 'Mira tu correo'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'email'
                  ? 'Entra o crea tu cuenta con un código. Sin contraseñas que recordar.'
                  : `Enviamos un código de seis dígitos a ${email}.`}
              </Text>
            </View>
            <View style={styles.mascot}>
              <NuniMascot size={188} />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.stepRow}>
              <View style={[styles.stepDot, styles.stepDotActive]}>
                <Text style={styles.stepDotActiveText}>1</Text>
              </View>
              <View style={[styles.stepLine, step === 'code' && styles.stepLineActive]} />
              <View style={[styles.stepDot, step === 'code' && styles.stepDotActive]}>
                <Text style={step === 'code' ? styles.stepDotActiveText : styles.stepDotText}>2</Text>
              </View>
            </View>

            {step === 'email' ? (
              <>
                <View style={styles.heading}>
                  <Text style={styles.cardTitle}>¿Cuál es tu correo?</Text>
                  <Text style={styles.cardText}>
                    El mismo proceso sirve para crear una cuenta nueva o volver a entrar.
                  </Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Correo electrónico</Text>
                  <View style={[styles.inputShell, error && styles.inputShellError]}>
                    <Text style={styles.inputIcon}>@</Text>
                    <TextInput
                      accessibilityLabel="Correo electrónico"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      editable={!isSubmitting}
                      keyboardType="email-address"
                      onChangeText={(value) => {
                        setEmail(value);
                        setError(undefined);
                      }}
                      onSubmitEditing={() => void sendCode()}
                      placeholder="tu@correo.com"
                      placeholderTextColor={colors.textMuted}
                      style={styles.input}
                      textContentType="emailAddress"
                      value={email}
                    />
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => void sendCode()}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    isSubmitting && styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? 'Enviando código…' : 'Recibir código'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.heading}>
                  <Text style={styles.cardTitle}>Introduce el código</Text>
                  <Text style={styles.cardText}>
                    Puede tardar unos segundos. Revisa también la carpeta de correo no deseado.
                  </Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Código de seguridad</Text>
                  <TextInput
                    accessibilityLabel="Código de seguridad de ocho dígitos"
                    autoComplete="one-time-code"
                    autoFocus
                    editable={!isSubmitting}
                    keyboardType="number-pad"
                    maxLength={8}
                    onChangeText={(value) => {
                      setCode(normalizeOtp(value));
                      setError(undefined);
                    }}
                    onSubmitEditing={() => void verifyCode()}
                    placeholder="••••••••"
                    placeholderTextColor={colors.border}
                    style={[styles.codeInput, error && styles.codeInputError]}
                    textContentType="oneTimeCode"
                    value={code}
                  />
                  <Text style={styles.codeHint}>{code.length} de 8 números</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={() => void verifyCode()}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    isSubmitting && styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? 'Comprobando…' : 'Entrar en Niduna'}
                  </Text>
                </Pressable>
                <View style={styles.secondaryActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={resendSeconds > 0 || isSubmitting}
                    onPress={() => void sendCode()}
                    style={({ pressed }) => [styles.textButton, pressed && styles.textButtonPressed]}
                  >
                    <Text
                      style={[
                        styles.textButtonLabel,
                        resendSeconds > 0 && styles.textButtonLabelDisabled,
                      ]}
                    >
                      {resendSeconds > 0
                        ? `Reenviar en ${resendSeconds} s`
                        : 'Reenviar código'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={changeEmail}
                    style={({ pressed }) => [styles.textButton, pressed && styles.textButtonPressed]}
                  >
                    <Text style={styles.textButtonLabel}>Cambiar correo</Text>
                  </Pressable>
                </View>
              </>
            )}

            {error ? (
              <View accessibilityLiveRegion="polite" style={styles.errorNotice}>
                <Text style={styles.errorMark}>!</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.securityNote}>
            <View style={styles.securityMark}>
              <Text style={styles.securityMarkText}>✓</Text>
            </View>
            <View style={styles.securityCopy}>
              <Text style={styles.securityTitle}>Acceso sencillo y privado</Text>
              <Text style={styles.securityText}>
                El código es de un solo uso. Niduna nunca te pedirá una contraseña.
              </Text>
            </View>
          </View>
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
    maxWidth: 620,
    paddingBottom: 56,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    width: '100%',
  },
  hero: {
    backgroundColor: colors.sky,
    borderRadius: 32,
    minHeight: 238,
    overflow: 'hidden',
    padding: spacing.xl,
  },
  heroGlow: {
    backgroundColor: colors.lavenderSoft,
    borderRadius: 140,
    height: 250,
    opacity: 0.72,
    position: 'absolute',
    right: -82,
    top: -96,
    width: 250,
  },
  heroCopy: { maxWidth: 340, zIndex: 2 },
  brand: {
    color: colors.coral,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.4,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 36,
  },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 21, marginTop: spacing.sm },
  mascot: { alignSelf: 'flex-end', marginBottom: -18, marginRight: -6, marginTop: -30 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xl,
    padding: spacing.xl,
  },
  stepRow: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', width: 104 },
  stepDot: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  stepDotActive: { backgroundColor: colors.coral },
  stepDotText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  stepDotActiveText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  stepLine: { backgroundColor: colors.surfaceMuted, flex: 1, height: 3 },
  stepLineActive: { backgroundColor: colors.coral },
  heading: { gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  cardText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  field: { gap: spacing.sm },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: spacing.lg,
  },
  inputShellError: { borderColor: colors.error },
  inputIcon: { color: colors.primaryPressed, fontSize: 18, fontWeight: '900', marginRight: spacing.md },
  input: { color: colors.text, flex: 1, fontSize: 16, paddingVertical: spacing.md },
  codeInput: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 12,
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },
  codeInputError: { borderColor: colors.error },
  codeHint: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonPressed: { backgroundColor: colors.coralPressed, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.62 },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  secondaryActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  textButton: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  textButtonPressed: { backgroundColor: colors.aquaSoft },
  textButtonLabel: { color: colors.primaryPressed, fontSize: 13, fontWeight: '800' },
  textButtonLabelDisabled: { color: colors.textMuted },
  errorNotice: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  errorMark: {
    color: colors.error,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    width: 24,
  },
  errorText: { color: colors.error, flex: 1, fontSize: 12, lineHeight: 17 },
  securityNote: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  securityMark: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  securityMarkText: { color: colors.primaryPressed, fontSize: 17, fontWeight: '900' },
  securityCopy: { flex: 1 },
  securityTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  securityText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: spacing.xs },
});
