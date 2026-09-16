import { describe, expect, it } from 'vitest';

import {
  loadFeedingMethodPreference,
  saveFeedingMethodPreference,
} from '../src/features/care/infrastructure/feeding-method-preference-storage';

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('feeding method preference storage', () => {
  it('remembers the latest feeding method independently for each baby', () => {
    const storage = createStorage();

    saveFeedingMethodPreference('baby-a', 'formula', storage);
    saveFeedingMethodPreference('baby-b', 'expressed_milk', storage);

    expect(loadFeedingMethodPreference('baby-a', storage)).toBe('formula');
    expect(loadFeedingMethodPreference('baby-b', storage)).toBe('expressed_milk');
  });

  it('falls back to breast when the stored value is missing or invalid', () => {
    const storage = createStorage();
    storage.setItem('niduna.care.feeding-method.baby-a', 'invalid');

    expect(loadFeedingMethodPreference('baby-a', storage)).toBe('breast');
    expect(loadFeedingMethodPreference('baby-b', storage)).toBe('breast');
  });
});
