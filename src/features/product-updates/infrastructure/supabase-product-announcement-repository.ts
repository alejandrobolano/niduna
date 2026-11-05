import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { isPwaStandalone } from '@/features/pwa/application/pwa-installation';
import type { ProductAnnouncementRepository } from '@/features/product-updates/application/product-announcement-repository';
import {
  isVersionAtLeast,
  type ProductAnnouncement,
  type ProductAnnouncementRoute,
} from '@/features/product-updates/domain/product-announcement';
import { supabase } from '@/shared/infrastructure/supabase/client';

const nativeVersion = Constants.expoConfig?.version ?? '0.0.0';
const pwaUpdatePreviewId = 'preview-pwa-auto-updates';
const pwaUpdatePreviewStorageKey = 'niduna.preview.pwa-auto-updates.seen';

const pwaUpdatePreview: ProductAnnouncement = {
  description:
    'Cierra Niduna completamente desde el selector de aplicaciones y vuelve a abrirla una vez. No necesitas cerrar sesión. A partir de entonces, Niduna podrá avisarte y actualizarse desde la propia app.',
  id: pwaUpdatePreviewId,
  title: 'Un último paso para actualizar Niduna',
};

function isStandaloneWebApp(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;

  return isPwaStandalone(Platform.OS, {
    matchDisplayMode:
      typeof window.matchMedia === 'function'
        ? window.matchMedia.bind(window)
        : undefined,
    navigatorStandalone:
      typeof navigator === 'undefined'
        ? false
        : Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
  });
}

function loadDevelopmentPreview(): ProductAnnouncement[] {
  if (
    !isStandaloneWebApp() ||
    typeof window === 'undefined' ||
    window.location.hostname !== 'dev.niduna.com' ||
    window.sessionStorage.getItem(pwaUpdatePreviewStorageKey)
  ) {
    return [];
  }

  return [pwaUpdatePreview];
}

export const supabaseProductAnnouncementRepository: ProductAnnouncementRepository = {
  async loadPending(userId) {
    const { data: announcements, error } = await supabase
      .from('product_announcements')
      .select('id,title,description,action_label,target_route,minimum_native_version,web_display_mode')
      .contains('platforms', [Platform.OS])
      .order('published_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!announcements.length) return [];

    const { data: reads, error: readsError } = await supabase
      .from('product_announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId)
      .in('announcement_id', announcements.map((item) => item.id));

    if (readsError) throw readsError;
    const seenIds = new Set(reads.map((item) => item.announcement_id));

    const pendingAnnouncements = announcements
      .filter(
        (item) =>
          !seenIds.has(item.id) &&
          (!item.web_display_mode ||
            (item.web_display_mode === 'standalone' && isStandaloneWebApp())) &&
          (Platform.OS === 'web' ||
            !item.minimum_native_version ||
            isVersionAtLeast(nativeVersion, item.minimum_native_version)),
      )
      .map<ProductAnnouncement>((item) => ({
        actionLabel: item.action_label ?? undefined,
        description: item.description,
        id: item.id,
        targetRoute: (item.target_route as ProductAnnouncementRoute | null) ?? undefined,
        title: item.title,
      }));

    return [...loadDevelopmentPreview(), ...pendingAnnouncements];
  },

  async markSeen(announcementIds, userId) {
    if (!announcementIds.length) return;

    const persistedAnnouncementIds = announcementIds.filter(
      (announcementId) => announcementId !== pwaUpdatePreviewId,
    );

    if (persistedAnnouncementIds.length !== announcementIds.length) {
      window.sessionStorage.setItem(pwaUpdatePreviewStorageKey, 'true');
    }

    if (!persistedAnnouncementIds.length) return;

    const { error } = await supabase.from('product_announcement_reads').upsert(
      persistedAnnouncementIds.map((announcementId) => ({
        announcement_id: announcementId,
        seen_at: new Date().toISOString(),
        user_id: userId,
      })),
      { onConflict: 'announcement_id,user_id' },
    );

    if (error) throw error;
  },
};
