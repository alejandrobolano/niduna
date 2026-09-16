import type { MemberAvatarVariant } from '@/features/avatars/domain/avatar';
import type { FamilyRelationship } from '@/features/family/domain/family';

export const familyStoryReactionOptions = [
  { emoji: '❤️', label: 'Me encanta', value: 'heart' },
  { emoji: '🥰', label: 'Qué ternura', value: 'tender' },
  { emoji: '🥳', label: 'Celebrar', value: 'celebrate' },
  { emoji: '😂', label: 'Me divierte', value: 'laugh' },
  { emoji: '😮', label: 'Me sorprende', value: 'surprise' },
  { emoji: '🤪', label: 'Qué locura', value: 'silly' },
] as const;

export type FamilyStoryReaction = typeof familyStoryReactionOptions[number]['value'];

export interface FamilyStoryReactionSummary {
  count: number;
  reaction: FamilyStoryReaction;
}

export interface FamilyStory {
  author: {
    avatarKey?: MemberAvatarVariant;
    avatarUrl?: string;
    displayName: string;
    id: string;
    relationship?: FamilyRelationship;
  };
  createdAt: string;
  expiresAt: string;
  id: string;
  imageUrl: string;
  isViewed: boolean;
  reactions: FamilyStoryReactionSummary[];
  viewerReaction?: FamilyStoryReaction;
}

export function applyFamilyStoryReaction(
  story: FamilyStory,
  nextReaction?: FamilyStoryReaction,
): FamilyStory {
  const counts = new Map(
    story.reactions.map(({ count, reaction }) => [reaction, count]),
  );

  if (story.viewerReaction) {
    counts.set(story.viewerReaction, Math.max(0, (counts.get(story.viewerReaction) ?? 0) - 1));
  }

  if (nextReaction) {
    counts.set(nextReaction, (counts.get(nextReaction) ?? 0) + 1);
  }

  return {
    ...story,
    reactions: familyStoryReactionOptions.flatMap(({ value }) => {
      const count = counts.get(value) ?? 0;
      return count > 0 ? [{ count, reaction: value }] : [];
    }),
    viewerReaction: nextReaction,
  };
}

export interface FamilyStoryGroup {
  author: FamilyStory['author'];
  hasUnseenStories: boolean;
  latestCreatedAt: string;
  stories: FamilyStory[];
}

export function groupFamilyStories(
  stories: FamilyStory[],
): FamilyStoryGroup[] {
  const grouped = new Map<string, FamilyStory[]>();

  for (const story of stories) {
    const authorStories = grouped.get(story.author.id) ?? [];
    authorStories.push(story);
    grouped.set(story.author.id, authorStories);
  }

  return [...grouped.values()]
    .map((authorStories) => {
      const sortedStories = [...authorStories].sort(
        (left, right) =>
          Date.parse(left.createdAt) - Date.parse(right.createdAt),
      );
      const latestStory = sortedStories.at(-1)!;

      return {
        author: latestStory.author,
        hasUnseenStories: sortedStories.some((story) => !story.isViewed),
        latestCreatedAt: latestStory.createdAt,
        stories: sortedStories,
      };
    })
    .sort(
      (left, right) =>
        Date.parse(right.latestCreatedAt) - Date.parse(left.latestCreatedAt),
    );
}

export function formatStoryElapsedTime(
  createdAt: string,
  now = new Date(),
): string {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(createdAt)) / 60_000),
  );

  if (elapsedMinutes < 1) {
    return 'Ahora';
  }

  if (elapsedMinutes < 60) {
    return `Hace ${elapsedMinutes} min`;
  }

  return `Hace ${Math.floor(elapsedMinutes / 60)} h`;
}
