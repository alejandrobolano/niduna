import Constants from 'expo-constants';
import { RefreshCw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { isNewWebAppRelease } from '@/features/app-updates/domain/web-app-release';
import { loadAvailableWebAppRelease } from '@/features/app-updates/infrastructure/web-app-release-service';
import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';
import { colors } from '@/shared/presentation/theme';

const currentReleaseId =
  process.env.EXPO_PUBLIC_WEB_RELEASE_ID ?? Constants.expoConfig?.version;

export function WebAppUpdateObserver() {
  const [availableReleaseId, setAvailableReleaseId] = useState<string>();
  const dismissedReleaseId = useRef<string | undefined>(undefined);
  const checking = useRef(false);

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      !currentReleaseId ||
      typeof document === 'undefined'
    ) {
      return;
    }

    const activeReleaseId = currentReleaseId;
    let active = true;

    async function checkForUpdate() {
      if (checking.current) {
        return;
      }

      checking.current = true;

      try {
        const releaseId = await loadAvailableWebAppRelease();

        if (
          active &&
          releaseId &&
          releaseId !== dismissedReleaseId.current &&
          isNewWebAppRelease(activeReleaseId, releaseId)
        ) {
          setAvailableReleaseId(releaseId);
        }
      } catch {
        // An update check must never interrupt care logging.
      } finally {
        checking.current = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void checkForUpdate();
      }
    }

    void checkForUpdate();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (Platform.OS !== 'web' || !availableReleaseId) {
    return null;
  }

  return (
    <ConfirmationModal
      cancelLabel="Más tarde"
      confirmLabel="Actualizar ahora"
      description="La actualización tarda solo unos segundos y conservará los datos que ya hayas guardado."
      eyebrow="ACTUALIZACIÓN DISPONIBLE"
      icon={<RefreshCw color={colors.primaryPressed} size={23} />}
      onCancel={() => {
        dismissedReleaseId.current = availableReleaseId;
        setAvailableReleaseId(undefined);
      }}
      onConfirm={() => window.location.reload()}
      title="Hay una nueva versión de Niduna"
      visible
    />
  );
}
