import { BellRing, CircleCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import type {
  NotificationRepository,
  PushPermissionService,
} from '@/features/notifications/application/notification-repository';
import { activateFamilyNotifications } from '@/features/notifications/application/activate-family-notifications';
import {
  postponeNotificationPrompt,
  shouldShowNotificationPrompt,
  type NotificationPromptState,
} from '@/features/notifications/application/notification-prompt-schedule';
import { defaultNotificationPreferences } from '@/features/notifications/domain/notification-preferences';
import {
  loadNotificationPromptState,
  saveNotificationPromptState,
} from '@/features/notifications/infrastructure/notification-prompt-storage';
import { colors, createThemedStyleSheet } from '@/shared/presentation/theme';
import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';

interface NotificationOptInModalProps {
  familyId: string;
  onActivated?: () => void;
  onResolved?: () => void;
  permissionService: PushPermissionService;
  presentation?: 'onboarding' | 'scheduled';
  repository: NotificationRepository;
  suppressed?: boolean;
  userId: string;
}

export function NotificationOptInModal({
  familyId,
  onActivated,
  onResolved,
  permissionService,
  presentation = 'scheduled',
  repository,
  suppressed = false,
  userId,
}: NotificationOptInModalProps) {
  const [promptState, setPromptState] = useState<NotificationPromptState>(() =>
    loadNotificationPromptState(userId),
  );
  const [isPending, setIsPending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasActiveDevice, setHasActiveDevice] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (suppressed) {
      return;
    }

    let active = true;

    void permissionService
      .getExistingRegistration()
      .then(async (registration) => ({
        registration,
        settings: await repository.loadSettings(familyId, userId, registration),
      }))
      .then(({ settings }) => {
        if (active) {
          setHasActiveDevice(settings.hasActiveDevice);
          setIsVisible(
            presentation === 'onboarding' ||
              (!settings.hasActiveDevice &&
                shouldShowNotificationPrompt(promptState, new Date())),
          );
        }
      })
      .catch(() => {
        if (active && presentation === 'onboarding') {
          setMessage('No pudimos comprobar el estado de los avisos. Puedes intentarlo ahora.');
          setIsVisible(true);
        }
      });

    return () => {
      active = false;
    };
  }, [
    familyId,
    permissionService,
    presentation,
    promptState,
    repository,
    suppressed,
    userId,
  ]);

  function postpone() {
    if (!hasActiveDevice) {
      const next = postponeNotificationPrompt(promptState, new Date());
      saveNotificationPromptState(userId, next);
      setPromptState(next);
    }

    setIsVisible(false);
    setMessage(undefined);
    onResolved?.();
  }

  async function enableNotifications() {
    setIsPending(true);
    setMessage(undefined);

    try {
      const result = await activateFamilyNotifications({
        familyId,
        permissionService,
        preferences: defaultNotificationPreferences,
        repository,
        userId,
      });

      if (result === 'denied') {
        setMessage(
          'El permiso está bloqueado. Actívalo desde los ajustes del navegador o del dispositivo.',
        );
        return;
      }

      if (result === 'unavailable') {
        setMessage('Este dispositivo no pudo preparar las notificaciones.');
        return;
      }

      setHasActiveDevice(true);
      onActivated?.();
      onResolved?.();
      setIsVisible(false);
    } catch {
      setMessage('No pudimos activar los avisos. Comprueba la conexión.');
    } finally {
      setIsPending(false);
    }
  }

  const isLastReminder = promptState.dismissals === 2;
  const isOnboarding = presentation === 'onboarding';
  const title = hasActiveDevice ? 'Ya estás al día' : 'No te pierdas el relevo';
  const description = hasActiveDevice
    ? 'Los avisos ya están activos en este dispositivo. Podrás personalizarlos cuando quieras desde Mi cuenta y ajustes.'
    : isOnboarding
      ? 'Activa los avisos para enterarte de los cuidados, medidas, notas e historias que comparta tu familia. El sistema operativo o la conexión pueden retrasarlos.'
      : isLastReminder
        ? 'Este es el último recordatorio. Si prefieres esperar, podrás activarlos cuando quieras desde Tu cuenta.'
        : 'Recibe en este dispositivo los cuidados, medidas, notas e historias que comparta tu familia.';

  return (
    <ConfirmationModal
      cancelLabel={hasActiveDevice ? 'Cerrar' : 'Ahora no'}
      confirmLabel={hasActiveDevice ? 'Continuar' : 'Activar avisos'}
      description={description}
      eyebrow={hasActiveDevice ? 'CONFIGURACIÓN COMPLETA' : 'AVISOS DE TU FAMILIA'}
      icon={
        hasActiveDevice ? (
          <CircleCheck color={colors.primaryPressed} size={23} />
        ) : (
          <BellRing color={colors.primaryPressed} size={23} />
        )
      }
      isPending={isPending}
      onCancel={postpone}
      onConfirm={
        hasActiveDevice
          ? () => {
              setIsVisible(false);
              onResolved?.();
            }
          : () => void enableNotifications()
      }
      title={title}
      visible={!suppressed && isVisible}
    >
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      ) : null}
    </ConfirmationModal>
  );
}

const styles = createThemedStyleSheet((colors) => ({
  message: { color: colors.error, fontSize: 13, lineHeight: 19 },
}));
