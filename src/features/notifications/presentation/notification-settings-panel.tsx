import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  NotificationRepository,
  PushPermissionService,
} from '@/features/notifications/application/notification-repository';
import {
  defaultNotificationPreferences,
  type NotificationCategory,
  type NotificationPreferences,
} from '@/features/notifications/domain/notification-preferences';
import { colors, radius, spacing } from '@/shared/presentation/theme';

const categoryLabels: Record<NotificationCategory, string> = {
  diaper: 'Pañal',
  feeding: 'Alimentación',
  sleep: 'Sueño',
};

interface NotificationSettingsPanelProps {
  familyId: string;
  familyName: string;
  permissionService: PushPermissionService;
  repository: NotificationRepository;
  userId: string;
}

function isPaused(preferences: NotificationPreferences): boolean {
  return Boolean(
    preferences.pausedUntil &&
      Date.parse(preferences.pausedUntil) > Date.now(),
  );
}

function toggleCategory(
  preferences: NotificationPreferences,
  category: NotificationCategory,
): NotificationPreferences {
  if (category === 'feeding') {
    return { ...preferences, feedingEnabled: !preferences.feedingEnabled };
  }

  if (category === 'diaper') {
    return { ...preferences, diaperEnabled: !preferences.diaperEnabled };
  }

  return { ...preferences, sleepEnabled: !preferences.sleepEnabled };
}

function categoryIsEnabled(
  preferences: NotificationPreferences,
  category: NotificationCategory,
): boolean {
  if (category === 'feeding') {
    return preferences.feedingEnabled;
  }

  if (category === 'diaper') {
    return preferences.diaperEnabled;
  }

  return preferences.sleepEnabled;
}

export function NotificationSettingsPanel({
  familyId,
  familyName,
  permissionService,
  repository,
  userId,
}: NotificationSettingsPanelProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences,
  );
  const [hasActiveDevice, setHasActiveDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(Platform.OS !== 'web');
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let active = true;

    void permissionService
      .getExistingRegistration()
      .then((registration) =>
        repository.loadSettings(familyId, userId, registration?.token),
      )
      .then((settings) => {
        if (active) {
          setHasActiveDevice(settings.hasActiveDevice);
          setPreferences(settings.preferences);
        }
      })
      .catch(() => {
        if (active) {
          setMessage('No pudimos cargar tus preferencias.');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [familyId, permissionService, repository, userId]);

  async function savePreferences(next: NotificationPreferences) {
    const previous = preferences;
    setPreferences(next);
    setIsWorking(true);
    setMessage(undefined);

    try {
      await repository.savePreferences(familyId, userId, next);
    } catch {
      setPreferences(previous);
      setMessage('No pudimos guardar el cambio. Inténtalo de nuevo.');
    } finally {
      setIsWorking(false);
    }
  }

  async function enableNotifications() {
    setIsWorking(true);
    setMessage(undefined);

    try {
      const result = await permissionService.requestRegistration();

      if (result.status === 'denied') {
        setMessage(
          'El permiso está desactivado. Puedes habilitarlo desde los ajustes del dispositivo.',
        );
        return;
      }

      if (result.status === 'unavailable') {
        setMessage('No pudimos preparar las notificaciones en este dispositivo.');
        return;
      }

      await repository.registerDevice(result.registration);
      await repository.savePreferences(familyId, userId, preferences);
      setHasActiveDevice(true);
      setMessage('Avisos activados para este dispositivo.');
    } catch {
      setMessage('No pudimos activar los avisos. Comprueba la conexión.');
    } finally {
      setIsWorking(false);
    }
  }

  function togglePause() {
    const nextPausedUntil = isPaused(preferences)
      ? undefined
      : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    void savePreferences({ ...preferences, pausedUntil: nextPausedUntil });
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Notificaciones</Text>
        <Text style={styles.description}>
          Los avisos push se configuran desde la app de Android o iOS.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Notificaciones</Text>
          <Text numberOfLines={2} style={styles.familyName}>
            {familyName}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            hasActiveDevice && styles.statusBadgeActive,
          ]}
        >
          <Text style={styles.statusText}>
            {hasActiveDevice ? 'ACTIVAS' : 'INACTIVAS'}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>
        Recibe un aviso discreto cuando otra persona registre un cuidado.
      </Text>

      {!hasActiveDevice ? (
        <Pressable
          accessibilityRole="button"
          disabled={isLoading || isWorking}
          onPress={() => void enableNotifications()}
          style={({ pressed }) => [
            styles.enableButton,
            pressed && styles.buttonPressed,
            (isLoading || isWorking) && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.enableButtonText}>
            {isLoading ? 'Comprobando…' : 'Activar en este dispositivo'}
          </Text>
        </Pressable>
      ) : (
        <>
          <View style={styles.categories}>
            {(['feeding', 'diaper', 'sleep'] as const).map((category) => {
              const enabled = categoryIsEnabled(preferences, category);

              return (
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: enabled, disabled: isWorking }}
                  disabled={isWorking}
                  key={category}
                  onPress={() =>
                    void savePreferences(toggleCategory(preferences, category))
                  }
                  style={[
                    styles.category,
                    enabled && styles.categoryEnabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryMark,
                      enabled && styles.categoryMarkEnabled,
                    ]}
                  >
                    {enabled ? '✓' : '–'}
                  </Text>
                  <Text style={styles.categoryLabel}>
                    {categoryLabels[category]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isWorking}
            onPress={togglePause}
            style={styles.pauseButton}
          >
            <Text style={styles.pauseButtonText}>
              {isPaused(preferences)
                ? 'Reanudar avisos'
                : 'Pausar durante 8 horas'}
            </Text>
          </Pressable>
        </>
      )}

      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.aquaSoft,
    borderRadius: radius.lg,
    gap: spacing.md,
    padding: spacing.lg,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headingCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  familyName: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  statusBadge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusBadgeActive: { backgroundColor: colors.butterSoft },
  statusText: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
  description: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  enableButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 48,
  },
  enableButtonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  categories: { gap: spacing.sm },
  category: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 42,
    paddingHorizontal: spacing.md,
  },
  categoryEnabled: { borderColor: colors.aqua },
  categoryMark: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '900',
    width: 20,
  },
  categoryMarkEnabled: { color: colors.primaryPressed },
  categoryLabel: { color: colors.text, fontSize: 12, fontWeight: '800' },
  pauseButton: { alignSelf: 'flex-start' },
  pauseButtonText: {
    color: colors.primaryPressed,
    fontSize: 11,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  message: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
