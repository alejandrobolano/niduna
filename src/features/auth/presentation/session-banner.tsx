import Constants from 'expo-constants';
import { ChevronRight, History, Settings2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/presentation/auth-provider';
import { resolveMemberAvatar } from '@/features/avatars/domain/avatar';
import { AnimalAvatar } from '@/features/avatars/presentation/animal-avatar';
import { ThemePreferenceControl } from '@/shared/presentation/theme-preference-control';
import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface SessionBannerProps {
  email: string;
  userId: string;
  onOpenAccountSettings: () => void;
  onOpenFamilyActivity?: () => void;
}

export function SessionBanner({
  email,
  userId,
  onOpenAccountSettings,
  onOpenFamilyActivity,
}: SessionBannerProps) {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string>();
  const [isOpen, setIsOpen] = useState(false);
  const appVersion = Constants.expoConfig?.version;

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
    <>
      <Pressable
        accessibilityLabel="Abrir mi cuenta"
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [
          styles.accountButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <AnimalAvatar accessibilityLabel="Tu avatar" size={34} variant={resolveMemberAvatar(userId)} />
      </Pressable>
      <Modal
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        transparent
        visible={isOpen}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Cerrar panel de cuenta"
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={styles.backdrop}
          />
          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Text style={styles.panelEyebrow}>TU CUENTA</Text>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                onPress={() => setIsOpen(false)}
                style={styles.closeButton}
              >
                <X color={colors.text} size={18} />
              </Pressable>
            </View>
            <View style={styles.panelContent}>
              <View style={styles.identity}>
                <AnimalAvatar accessibilityLabel="Tu avatar" size={52} variant={resolveMemberAvatar(userId)} />
                <View style={styles.copy}>
                  <Text numberOfLines={2} style={styles.email}>
                    {email}
                  </Text>
                  <Text style={styles.caption}>
                    Sesión protegida en este dispositivo
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityHint="Abre la pantalla completa de ajustes"
                accessibilityRole="button"
                onPress={() => {
                  setIsOpen(false);
                  onOpenAccountSettings();
                }}
                style={({ pressed }) => [
                  styles.settingsLink,
                  pressed && styles.buttonPressed,
                ]}
              >
                <View style={styles.settingsIcon}>
                  <Settings2 color={colors.coral} size={19} />
                </View>
                <View style={styles.copy}>
                  <Text style={styles.linkTitle}>Mi cuenta y ajustes</Text>
                  <Text style={styles.linkText}>
                    Perfil, avisos, dispositivo y privacidad
                  </Text>
                </View>
                <ChevronRight color={colors.textMuted} size={18} />
              </Pressable>
              <ThemePreferenceControl />
              {onOpenFamilyActivity ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setIsOpen(false);
                    onOpenFamilyActivity();
                  }}
                  style={({ pressed }) => [
                    styles.activityLink,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <View style={styles.activityIcon}>
                    <History color={colors.primaryPressed} size={19} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.linkTitle}>Actividad familiar</Text>
                    <Text style={styles.linkText}>
                      Consulta los cambios realizados por la familia.
                    </Text>
                  </View>
                  <ChevronRight color={colors.textMuted} size={18} />
                </Pressable>
              ) : null}
              {error ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {error}
                </Text>
              ) : null}
            </View>
            <View style={styles.panelFooter}>
              <Pressable
                accessibilityRole="button"
                disabled={isSigningOut}
                onPress={() => void handleSignOut()}
                style={({ pressed }) => [
                  styles.signOutButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.signOutButtonText}>
                  {isSigningOut ? 'Saliendo…' : 'Cerrar sesión'}
                </Text>
              </Pressable>
              <Text style={styles.version}>
                Niduna{appVersion ? ` v${appVersion}` : ''}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  accountButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    minHeight: 48,
    width: 48,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  avatarText: { color: colors.lavender, fontSize: 14, fontWeight: '900' },
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
    gap: spacing.lg,
    maxWidth: 380,
    padding: spacing.xl,
    width: '88%',
  },
  panelHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelContent: { gap: spacing.lg },
  panelEyebrow: {
    color: colors.coral,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closeButtonText: { color: colors.text, fontSize: 25, lineHeight: 27 },
  identity: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  panelAvatar: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  panelAvatarText: { color: colors.lavender, fontSize: 20, fontWeight: '900' },
  copy: { flex: 1 },
  email: { color: colors.text, fontSize: 13, fontWeight: '800' },
  caption: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  settingsLink: {
    alignItems: 'center',
    backgroundColor: colors.peach,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
  },
  settingsIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  activityLink: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.md,
  },
  activityIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  linkTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  linkText: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  error: { color: colors.error, fontSize: 11, marginTop: spacing.xs },
  panelFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  signOutButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  buttonPressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  signOutButtonText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  version: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
}));
