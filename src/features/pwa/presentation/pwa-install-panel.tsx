import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/presentation/theme';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function PwaInstallPanel() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent>();
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(undefined);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (Platform.OS !== 'web') {
    return null;
  }

  async function install() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setInstallPrompt(undefined);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Niduna en tu dispositivo</Text>
      <Text style={styles.description}>
        {installed
          ? 'Ya estás usando Niduna como aplicación instalada.'
          : installPrompt
            ? 'Instálala para abrirla desde tu pantalla de inicio, sin la barra del navegador.'
            : 'Puedes añadirla a tu pantalla de inicio desde el menú Compartir o Instalar de tu navegador.'}
      </Text>
      {installPrompt && !installed ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void install()}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Instalar Niduna</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.butterSoft,
    borderRadius: radius.lg,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  description: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.text,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: spacing.lg,
  },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  buttonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
});
