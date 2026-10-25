import { PencilLine } from 'lucide-react-native';
import { useEffect, useState } from 'react';

import type { ProductAnnouncementRepository } from '@/features/product-updates/application/product-announcement-repository';
import type { ProductAnnouncement, ProductAnnouncementRoute } from '@/features/product-updates/domain/product-announcement';
import { ConfirmationModal } from '@/shared/presentation/confirmation-modal';
import { colors } from '@/shared/presentation/theme';

interface ProductAnnouncementModalProps {
  onNavigate: (route: ProductAnnouncementRoute) => void;
  onStatusChange: (status: 'loading' | 'resolved' | 'visible') => void;
  repository: ProductAnnouncementRepository;
  suppressed: boolean;
  userId: string;
}

export function ProductAnnouncementModal({ onNavigate, onStatusChange, repository, suppressed, userId }: ProductAnnouncementModalProps) {
  const [announcements, setAnnouncements] = useState<ProductAnnouncement[]>([]);

  useEffect(() => {
    if (suppressed) return;
    let active = true;
    onStatusChange('loading');

    void repository.loadPending(userId).then((pending) => {
      if (!active) return;
      setAnnouncements(pending);
      onStatusChange(pending.length ? 'visible' : 'resolved');
    }).catch(() => {
      if (active) onStatusChange('resolved');
    });

    return () => { active = false; };
  }, [onStatusChange, repository, suppressed, userId]);

  const current = announcements[0];
  if (!current) return null;

  const resolve = (navigate: boolean) => {
    setAnnouncements([]);
    onStatusChange('resolved');
    void repository.markSeen([current.id], userId);
    if (navigate && current.targetRoute) onNavigate(current.targetRoute);
  };

  return (
    <ConfirmationModal
      cancelLabel="Cerrar"
      confirmLabel={current.actionLabel ?? 'Entendido'}
      description={current.description}
      eyebrow="NOVEDAD EN NIDUNA"
      icon={<PencilLine color={colors.primaryPressed} size={23} />}
      onCancel={() => resolve(false)}
      onConfirm={() => resolve(true)}
      showCancel={Boolean(current.targetRoute)}
      title={current.title}
      visible={!suppressed}
    />
  );
}
