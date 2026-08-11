import { describe, expect, it, vi } from 'vitest';

import {
  publishCareDataChanged,
  subscribeToCareDataChanges,
} from '../src/features/care/application/care-data-events';

describe('care data events', () => {
  it('notifies active subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToCareDataChanges(listener);

    publishCareDataChanged();

    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('stops notifying unsubscribed listeners', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToCareDataChanges(listener);

    unsubscribe();
    publishCareDataChanged();

    expect(listener).not.toHaveBeenCalled();
  });
});
