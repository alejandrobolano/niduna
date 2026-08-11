import {
  FamilyStoryError,
  type FamilyStoryRepository,
} from '@/features/family-stories/application/family-story-repository';
import type { FamilyStory } from '@/features/family-stories/domain/family-story';
import { supabase } from '@/shared/infrastructure/supabase/client';

const signedUrlLifetimeSeconds = 5 * 60;

function mapError(code: string | undefined): FamilyStoryError {
  return new FamilyStoryError(code === '42501' ? 'not_allowed' : 'unknown');
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
  },

  async load(babyId, userId) {
    const { data: rows, error } = await supabase
      .from('family_stories')
      .select('id, author_user_id, created_at, expires_at, storage_path')
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
    const [profilesResult, viewsResult, urlsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', authorIds),
      supabase
        .from('family_story_views')
        .select('story_id')
        .eq('user_id', userId)
        .in('story_id', storyIds),
      Promise.all(
        rows.map((row) =>
          supabase.storage
            .from('family-stories')
            .createSignedUrl(row.storage_path, signedUrlLifetimeSeconds),
        ),
      ),
    ]);
    const relatedError = profilesResult.error ?? viewsResult.error;

    if (relatedError) {
      throw mapError(relatedError.code);
    }

    const names = new Map(
      (profilesResult.data ?? []).map((profile) => [
        profile.id,
        profile.display_name?.trim() || 'Familiar',
      ]),
    );
    const viewedIds = new Set(
      (viewsResult.data ?? []).map((view) => view.story_id),
    );

    return rows.flatMap((row, index): FamilyStory[] => {
      const signedUrl = urlsResult[index];

      if (signedUrl.error || !signedUrl.data.signedUrl) {
        return [];
      }

      return [{
        author: {
          displayName: names.get(row.author_user_id) ?? 'Familiar',
          id: row.author_user_id,
        },
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        id: row.id,
        imageUrl: signedUrl.data.signedUrl,
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
      .channel(`family-stories:${babyId}`)
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'family_story_views',
        },
        onChange,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
