import {
  ArrowLeft,
  Bell,
  Database,
  Smartphone,
  UserRound,
} from 'lucide-react-native';
import { type ReactNode, useEffect } from 'react';
import { BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, createThemedStyleSheet, radius, spacing } from '@/shared/presentation/theme';

interface AccountSettingsScreenProps {
  appearanceContent: ReactNode;
  dangerContent: ReactNode;
  dataContent: ReactNode;
  deviceContent?: ReactNode;
  email: string;
  notificationContent?: ReactNode;
  onBack: () => void;
}

interface SettingsSectionProps {
  children: ReactNode;
  icon: typeof Bell;
  title: string;
}

function SettingsSection({ children, icon: Icon, title }: SettingsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Icon color={colors.primaryPressed} size={19} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function AccountSettingsScreen({
  appearanceContent,
  dangerContent,
  dataContent,
  deviceContent,
  email,
  notificationContent,
  onBack,
}: AccountSettingsScreenProps) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });

    return () => subscription.remove();
  }, [onBack]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Pressable
              accessibilityLabel="Volver"
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <ArrowLeft color={colors.text} size={22} />
            </Pressable>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>Mi cuenta y ajustes</Text>
              <Text style={styles.subtitle}>
                Gestiona tus preferencias en este dispositivo.
              </Text>
            </View>
          </View>

          <SettingsSection icon={UserRound} title="Perfil">
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {email.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.identityCopy}>
                <Text numberOfLines={2} style={styles.email}>
                  {email}
                </Text>
                <Text style={styles.caption}>
                  Sesión protegida en este dispositivo
                </Text>
              </View>
            </View>
          </SettingsSection>

          <SettingsSection icon={Bell} title="Preferencias">
            {appearanceContent}
            {notificationContent}
          </SettingsSection>

          {deviceContent ? (
            <SettingsSection icon={Smartphone} title="Este dispositivo">
              {deviceContent}
            </SettingsSection>
          ) : null}

          <SettingsSection icon={Database} title="Datos y privacidad">
            {dataContent}
          </SettingsSection>

          <View style={styles.dangerArea}>{dangerContent}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  page: {
    alignItems: 'center',
    paddingBottom: 64,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  content: { gap: spacing.xl, maxWidth: 920, width: '100%' },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  headingCopy: { flex: 1, gap: spacing.xs },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.xl,
    width: '100%',
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionIcon: {
    alignItems: 'center',
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.lavenderSoft,
    borderRadius: radius.md,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarText: { color: colors.lavender, fontSize: 20, fontWeight: '900' },
  identityCopy: { flex: 1 },
  email: { color: colors.text, fontSize: 14, fontWeight: '900' },
  caption: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  dangerArea: { paddingHorizontal: spacing.sm },
  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
}));
