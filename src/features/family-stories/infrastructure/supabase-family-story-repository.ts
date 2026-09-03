import {
  FamilyStoryError,
  type FamilyStoryRepository,
} from '@/features/family-stories/application/family-story-repository';
import type { FamilyStory } from '@/features/family-stories/domain/family-story';
import { supabase } from '@/shared/infrastructure/supabase/client';
import { createRealtimeChannelTopic } from '@/shared/infrastructure/supabase/realtime-channel-topic';
import { createProfilePhotoUrls } from '@/features/avatars/infrastructure/profile-photo-urls';

const signedUrlLifetimeSeconds = 5 * 60;

function mapError(code: string | undefined): FamilyStoryError {
  return new FamilyStoryError(code === '42501' ? 'not_allowed' : 'unknown');
}

async function dispatchStoryNotification(storyId: string): Promise<void> {
  await Promise.allSettled([
    supabase.functions.invoke('dispatch-activity-notification', {
      body: { activityId: storyId, activityType: 'story' },
    }),
  ]);
}

export const supabaseFamilyStoryRepository: FamilyStoryRepository = {
  async create(babyId, image) {
    const { data: preparedRows, error: prepareError } = await supabase.rpc(
      'prepare_family_story',
      {
        target_baby_id: babyId,
        target_file_size_bytes: image.size,
        target_mime_type: image.mimeType,
      },
    );
    const prepared = preparedRows?.[0];

    if (prepareError || !prepared) {
      throw mapError(prepareError?.code);
    }

    const { error: uploadError } = await supabase.storage
      .from('family-stories')
      .upload(prepared.storage_path, image.bytes, {
        cacheControl: '300',
        contentType: image.mimeType,
        upsert: false,
      });

    if (uploadError) {
      await supabase.rpc('retire_family_story', {
        target_story_id: prepared.id,
      });
      throw new FamilyStoryError('upload_failed');
    }

    const { error: publishError } = await supabase.rpc(
      'publish_family_story',
      { target_story_id: prepared.id },
    );

    if (publishError) {
      await supabase.rpc('retire_family_story', {
        target_story_id: prepared.id,
      });
      throw mapError(publishError.code);
    }

    await dispatchStoryNotification(prepared.id);
  },

  async load(babyId, userId) {
    const { data: rows, error } = await supabase
      .from('family_stories')
      .select('id, author_user_id, family_id, created_at, expires_at, storage_path')
      .eq('baby_id', babyId)
      .order('created_at', { ascending: true });

    if (error) {
      throw mapError(error.code);
    }

    if (!rows?.length) {
      return [];
    }

    const authorIds = [...new Set(rows.map((row) => row.author_user_id))];
    const storyIds = rows.map((row) => row.id);
    const [profilesResult, membershipsResult, viewsResult, urlsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, avatar_key, avatar_path')
        .in('id', authorIds),
      supabase
        .from('family_members')
        .select('user_id, relationship')
        .eq('family_id', rows[0].family_id)
        .in('user_id', authorIds),
      supabase
        .from('family_story_views')
        .select('story_id')
        .eq('user_id', userId)
        .in('story_id', storyIds),
      supabase.storage
        .from('family-stories')
        .createSignedUrls(
          rows.map((row) => row.storage_path),
          signedUrlLifetimeSeconds,
        ),
    ]);
    const relatedError =
      profilesResult.error ?? membershipsResult.error ?? viewsResult.error ?? urlsResult.error;

    if (relatedError) {
      throw mapError('code' in relatedError ? relatedError.code : undefined);
    }

    const names = new Map(
      (profilesResult.data ?? []).map((profile) => [
        profile.id,
        profile.display_name?.trim() || 'Familiar',
      ]),
    );
    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
    const relationships = new Map((membershipsResult.data ?? []).map((membership) => [membership.user_id, membership.relationship]));
    const avatarUrls = await createProfilePhotoUrls((profilesResult.data ?? []).map((profile) => profile.avatar_path));
    const viewedIds = new Set(
      (viewsResult.data ?? []).map((view) => view.story_id),
    );

    return rows.flatMap((row, index): FamilyStory[] => {
      const signedUrl = urlsResult.data?.[index];

      if (!signedUrl || signedUrl.error || !signedUrl.signedUrl) {
        return [];
      }

      return [{
        author: {
          avatarKey: profiles.get(row.author_user_id)?.avatar_key ?? undefined,
          avatarUrl: profiles.get(row.author_user_id)?.avatar_path
            ? avatarUrls.get(profiles.get(row.author_user_id)!.avatar_path!)
            : undefined,
          displayName: names.get(row.author_user_id) ?? 'Familiar',
          id: row.author_user_id,
          relationship: relationships.get(row.author_user_id),
        },
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        id: row.id,
        imageUrl: signedUrl.signedUrl,
        isViewed: viewedIds.has(row.id),
      }];
    });
  },

  async markViewed(storyId) {
    const { error } = await supabase.rpc('mark_family_story_viewed', {
      target_story_id: storyId,
    });

    if (error) {
      throw mapError(error.code);
    }
  },

  async retire(storyId) {
    const { error } = await supabase.rpc('retire_family_story', {
      target_story_id: storyId,
    });

    if (error) {
      throw mapError(error.code);
    }
  },

  subscribe(babyId, onChange) {
    const channel = supabase
      .channel(createRealtimeChannelTopic('family-stories', babyId))
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `baby_id=eq.${babyId}`,
          schema: 'public',
          table: 'family_stories',
        },
        onChange,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
