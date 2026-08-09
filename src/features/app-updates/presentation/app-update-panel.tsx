import * as Application from 'expo-application';
import { Download } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppReleaseRepository } from '@/features/app-updates/application/app-release-repository';
import {
  isNewerBuild,
  type AppRelease,
} from '@/features/app-updates/domain/app-release';
import { colors, radius, spacing } from '@/shared/presentation/theme';

interface AppUpdatePanelProps {
  repository: AppReleaseRepository;
}

export function AppUpdatePanel({ repository }: AppUpdatePanelProps) {
  const [release, setRelease] = useState<AppRelease>();

  useEffect(() => {
    let active = true;

    void repository
      .loadLatestAndroidPreview()
      .then((latestRelease) => {
        if (active) {
          setRelease(latestRelease);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [repository]);

  if (!release) {
    return null;
  }

  const updateAvailable =
    Platform.OS === 'android' &&
    isNewerBuild(release.appBuildVersion, Application.nativeBuildVersion);

  if (Platform.OS !== 'web' && !updateAvailable) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.icon}>
          <Download color={colors.primaryPressed} size={19} strokeWidth={2.4} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {updateAvailable ? 'Actualización disponible' : 'APK de prueba'}
          </Text>
          <Text style={styles.version}>
            Niduna {release.appVersion} · compilación {release.appBuildVersion}
          </Text>
        </View>
      </View>
      <Text style={styles.description}>
        {updateAvailable
          ? 'Instala la nueva versión para probar los cambios más recientes.'
          : 'Última versión Android disponible para pruebas internas.'}
      </Text>
      <Pressable
        accessibilityRole="link"
        onPress={() => void Linking.openURL(release.artifactUrl)}
        style={({ pressed }) => [
          styles.downloadLink,
          pressed && styles.linkPressed,
        ]}
      >
        <Text style={styles.downloadText}>Descargar APK</Text>
      </Pressable>
      {Platform.OS === 'web' ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(release.buildDetailsUrl)}
          style={({ pressed }) => pressed && styles.linkPressed}
        >
          <Text style={styles.detailsLink}>Ver compilación en Expo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.butterSoft,
    borderRadius: radius.lg,
    gap: spacing.md,
    padding: spacing.lg,
  },
  heading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  version: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  description: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  downloadLink: { alignSelf: 'flex-start' },
  downloadText: {
    color: colors.primaryPressed,
    fontSize: 13,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  detailsLink: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  linkPressed: { opacity: 0.62 },
});
