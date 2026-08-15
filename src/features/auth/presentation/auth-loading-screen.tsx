import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NuniMascot } from '@/shared/presentation/nuni-mascot';
import { createThemedStyleSheet, spacing } from '@/shared/presentation/theme';

export function AuthLoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View accessibilityLiveRegion="polite" style={styles.content}>
        <NuniMascot size={150} />
        <Text style={styles.title}>Preparando Niduna</Text>
        <Text style={styles.text}>Comprobando tu sesión de forma segura…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: spacing.lg },
  text: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
}));
