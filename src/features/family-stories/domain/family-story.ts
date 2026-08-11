export interface FamilyStory {
  author: {
    displayName: string;
    id: string;
  };
  createdAt: string;
  expiresAt: string;
  id: string;
  imageUrl: string;
  isViewed: boolean;
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
