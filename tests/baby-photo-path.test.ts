import { describe, expect, it } from 'vitest';

import { createBabyPhotoPath } from '../src/features/baby-profile/application/baby-photo-path';

describe('baby photo path', () => {
  it('scopes each private image to its family and baby', () => {
    expect(
      createBabyPhotoPath('family-id', 'baby-id', 'unique-part'),
    ).toBe('family-id/baby-id/unique-part.jpg');
  });
});
