import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { ProductAnnouncementRepository } from '@/features/product-updates/application/product-announcement-repository';
import {
  isVersionAtLeast,
  type ProductAnnouncement,
  type ProductAnnouncementRoute,
} from '@/features/product-updates/domain/product-announcement';
import { supabase } from '@/shared/infrastructure/supabase/client';

const nativeVersion = Constants.expoConfig?.version ?? '0.0.0';

export const supabaseProductAnnouncementRepository: ProductAnnouncementRepository = {
  async loadPending(userId) {
    const { data: announcements, error } = await supabase
      .from('product_announcements')
      .select('id,title,description,action_label,target_route,minimum_native_version')
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

    return announcements
      .filter(
        (item) =>
          !seenIds.has(item.id) &&
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
  },

  async markSeen(announcementIds, userId) {
    if (!announcementIds.length) return;

    const { error } = await supabase.from('product_announcement_reads').upsert(
      announcementIds.map((announcementId) => ({
        announcement_id: announcementId,
        seen_at: new Date().toISOString(),
        user_id: userId,
      })),
      { onConflict: 'announcement_id,user_id' },
    );

    if (error) throw error;
  },
};
