import type { FamilyStory } from '@/features/family-stories/domain/family-story';

export interface PreparedStoryImage {
  bytes: ArrayBuffer;
  mimeType: 'image/jpeg';
  previewUri: string;
  size: number;
}

export interface FamilyStoryRepository {
  create(babyId: string, image: PreparedStoryImage): Promise<void>;
  load(babyId: string, userId: string): Promise<FamilyStory[]>;
  markViewed(storyId: string): Promise<void>;
  retire(storyId: string): Promise<void>;
  subscribe(babyId: string, onChange: () => void): () => void;
}

export class FamilyStoryError extends Error {
  constructor(
    public readonly reason:
      | 'invalid_image'
      | 'not_allowed'
      | 'upload_failed'
      | 'unknown',
  ) {
    super(reason);
    this.name = 'FamilyStoryError';
  }
}
