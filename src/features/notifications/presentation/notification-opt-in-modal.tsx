import { BellRing } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import type {
  NotificationRepository,
  PushPermissionService,
} from '@/features/notifications/application/notification-repository';
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
  permissionService: PushPermissionService;
  repository: NotificationRepository;
  userId: string;
}

export function NotificationOptInModal({
  familyId,
  onActivated,
  permissionService,
  repository,
  userId,
}: NotificationOptInModalProps) {
  const [promptState, setPromptState] = useState<NotificationPromptState>(() =>
    loadNotificationPromptState(userId),
  );
  const [isPending, setIsPending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    let active = true;

    void permissionService
      .getExistingRegistration()
      .then(async (registration) => ({
        registration,
        settings: await repository.loadSettings(familyId, userId, registration),
      }))
      .then(({ settings }) => {
        if (active && !settings.hasActiveDevice) {
          setIsVisible(shouldShowNotificationPrompt(promptState, new Date()));
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [familyId, permissionService, promptState, repository, userId]);

  function postpone() {
    const next = postponeNotificationPrompt(promptState, new Date());
    saveNotificationPromptState(userId, next);
    setPromptState(next);
    setIsVisible(false);
    setMessage(undefined);
  }

  async function enableNotifications() {
    setIsPending(true);
    setMessage(undefined);

    try {
      const result = await permissionService.requestRegistration();

      if (result.status === 'denied') {
        setMessage(
          'El permiso está bloqueado. Actívalo desde los ajustes del navegador o del dispositivo.',
        );
        return;
      }

      if (result.status === 'unavailable') {
        setMessage('Este dispositivo no pudo preparar las notificaciones.');
        return;
      }

      await repository.registerDevice(result.registration);
      await repository.savePreferences(
        familyId,
        userId,
        defaultNotificationPreferences,
      );
      onActivated?.();
      setIsVisible(false);
    } catch {
      setMessage('No pudimos activar los avisos. Comprueba la conexión.');
    } finally {
      setIsPending(false);
    }
  }

  const isLastReminder = promptState.dismissals === 2;

  return (
    <ConfirmationModal
      cancelLabel="Ahora no"
      confirmLabel="Activar avisos"
      description={
        isLastReminder
          ? 'Este es el último recordatorio. Si prefieres esperar, podrás activarlos cuando quieras desde Tu cuenta.'
          : 'Recibe en este dispositivo los cuidados, medidas, notas e historias que comparta tu familia.'
      }
      eyebrow="AVISOS DE TU FAMILIA"
      icon={<BellRing color={colors.primaryPressed} size={23} />}
      isPending={isPending}
      onCancel={postpone}
      onConfirm={() => void enableNotifications()}
      title="No te pierdas el relevo"
      visible={isVisible}
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
