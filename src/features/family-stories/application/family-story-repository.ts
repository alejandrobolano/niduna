import type {
  FamilyStory,
  FamilyStoryReaction,
} from '@/features/family-stories/domain/family-story';

export interface PreparedStoryMedia {
  bytes: ArrayBuffer;
  durationMs?: number;
  mediaType: 'image' | 'video';
  mimeType: 'image/jpeg' | 'video/mp4' | 'video/quicktime' | 'video/webm';
  previewUri: string;
  size: number;
}

export interface FamilyStoryRepository {
  create(babyId: string, media: PreparedStoryMedia): Promise<void>;
  load(babyId: string, userId: string): Promise<FamilyStory[]>;
  markViewed(storyId: string): Promise<void>;
  setReaction(storyId: string, reaction?: FamilyStoryReaction): Promise<void>;
  retire(storyId: string): Promise<void>;
  subscribe(babyId: string, onChange: () => void): () => void;
}

export class FamilyStoryError extends Error {
  constructor(
    public readonly reason:
      | 'invalid_media'
      | 'not_allowed'
      | 'upload_failed'
      | 'unknown',
  ) {
    super(reason);
    this.name = 'FamilyStoryError';
  }
}
