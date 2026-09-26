import { describe, expect, it } from 'vitest';

import {
  hasDiscoveredFeedingRhythm,
  markFeedingRhythmDiscovered,
} from './feeding-rhythm-discovery-storage';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe('feeding rhythm discovery storage', () => {
  it('stores discovery independently for each user and baby', () => {
    const storage = createStorage();

    markFeedingRhythmDiscovered('user-a', 'baby-a', storage);

    expect(hasDiscoveredFeedingRhythm('user-a', 'baby-a', storage)).toBe(true);
    expect(hasDiscoveredFeedingRhythm('user-a', 'baby-b', storage)).toBe(false);
    expect(hasDiscoveredFeedingRhythm('user-b', 'baby-a', storage)).toBe(false);
  });
});
