import type { ProductAnnouncement } from '@/features/product-updates/domain/product-announcement';

export interface ProductAnnouncementRepository {
  loadPending: (userId: string) => Promise<ProductAnnouncement[]>;
  markSeen: (announcementIds: readonly string[], userId: string) => Promise<void>;
}
