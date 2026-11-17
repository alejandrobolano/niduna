import { RefreshCw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { isNewWebAppRelease } from '@/features/app-updates/domain/web-app-release';
import { currentWebAppReleaseId } from '@/features/app-updates/infrastructure/web-app-build';
import { loadAvailableWebAppRelease } from '@/features/app-updates/infrastructure/web-app-release-service';
import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';
import { colors } from '@/shared/presentation/theme';

const updateCheckIntervalMilliseconds = 5 * 60 * 1000;

export function WebAppUpdateObserver() {
  const [availableReleaseId, setAvailableReleaseId] = useState<string>();
  const dismissedReleaseId = useRef<string | undefined>(undefined);
  const checking = useRef(false);

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      !currentWebAppReleaseId ||
      typeof document === 'undefined' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const activeReleaseId = currentWebAppReleaseId;
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

    function checkWhenVisible() {
      if (document.visibilityState === 'visible') {
        void checkForUpdate();
      }
    }

    void checkForUpdate();
    document.addEventListener('visibilitychange', checkWhenVisible);
    window.addEventListener('focus', checkWhenVisible);
    window.addEventListener('online', checkWhenVisible);
    window.addEventListener('pageshow', checkWhenVisible);
    const intervalId = window.setInterval(
      checkWhenVisible,
      updateCheckIntervalMilliseconds,
    );

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', checkWhenVisible);
      window.removeEventListener('focus', checkWhenVisible);
      window.removeEventListener('online', checkWhenVisible);
      window.removeEventListener('pageshow', checkWhenVisible);
      window.clearInterval(intervalId);
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
