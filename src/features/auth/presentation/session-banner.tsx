import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/presentation/auth-provider';
import { colors, radius, spacing } from '@/shared/presentation/theme';

interface SessionBannerProps {
  email: string;
}

export function SessionBanner({ email }: SessionBannerProps) {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSignOut() {
    setError(undefined);
    setIsSigningOut(true);

    try {
      await signOut();
    } catch {
      setError('No pudimos cerrar la sesión. Inténtalo de nuevo.');
      setIsSigningOut(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{email.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.email}>
          {email}
        </Text>
        <Text style={styles.caption}>Sesión protegida en este dispositivo</Text>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={isSigningOut}
        onPress={() => void handleSignOut()}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>{isSigningOut ? 'Saliendo…' : 'Salir'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: { color: colors.lavender, fontSize: 18, fontWeight: '900' },
  copy: { flex: 1 },
  email: { color: colors.text, fontSize: 13, fontWeight: '800' },
  caption: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  error: { color: colors.error, fontSize: 11, marginTop: spacing.xs },
  button: {
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  buttonPressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  buttonText: { color: colors.primaryPressed, fontSize: 12, fontWeight: '900' },
});
