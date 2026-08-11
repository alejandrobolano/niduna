import { describe, expect, it } from 'vitest';

import {
  formatStoryElapsedTime,
  groupFamilyStories,
  type FamilyStory,
} from '../src/features/family-stories/domain/family-story';

function story(
  id: string,
  authorId: string,
  createdAt: string,
  isViewed = false,
): FamilyStory {
  return {
    author: { displayName: `Author ${authorId}`, id: authorId },
    createdAt,
    expiresAt: '2026-08-12T12:00:00.000Z',
    id,
    imageUrl: `https://example.test/${id}`,
    isViewed,
  };
}

describe('groupFamilyStories', () => {
  it('groups by author, keeps story order and sorts authors by latest story', () => {
    const groups = groupFamilyStories([
      story('one', 'a', '2026-08-11T08:00:00.000Z', true),
      story('three', 'b', '2026-08-11T10:00:00.000Z'),
      story('two', 'a', '2026-08-11T09:00:00.000Z'),
    ]);

    expect(groups.map((group) => group.author.id)).toEqual(['b', 'a']);
    expect(groups[1].stories.map((item) => item.id)).toEqual(['one', 'two']);
    expect(groups[1].hasUnseenStories).toBe(true);
  });

  it('marks a group as seen only when every story was viewed', () => {
    const [group] = groupFamilyStories([
      story('one', 'a', '2026-08-11T08:00:00.000Z', true),
      story('two', 'a', '2026-08-11T09:00:00.000Z', true),
    ]);

    expect(group.hasUnseenStories).toBe(false);
  });
});

describe('formatStoryElapsedTime', () => {
  const now = new Date('2026-08-11T12:00:00.000Z');

  it('formats recent minutes and hours', () => {
    expect(formatStoryElapsedTime('2026-08-11T11:59:30.000Z', now)).toBe('Ahora');
    expect(formatStoryElapsedTime('2026-08-11T11:35:00.000Z', now)).toBe('Hace 25 min');
    expect(formatStoryElapsedTime('2026-08-11T09:00:00.000Z', now)).toBe('Hace 3 h');
  });
});
