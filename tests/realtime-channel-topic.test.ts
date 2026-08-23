import { describe, expect, it } from 'vitest';

import { createRealtimeChannelTopic } from '../src/shared/infrastructure/supabase/realtime-channel-topic';

describe('createRealtimeChannelTopic', () => {
  it('creates a distinct topic for every subscription', () => {
    const first = createRealtimeChannelTopic('care-events', 'baby-1');
    const second = createRealtimeChannelTopic('care-events', 'baby-1');

    expect(first).not.toBe(second);
    expect(first).toMatch(/^care-events:baby-1:/);
    expect(second).toMatch(/^care-events:baby-1:/);
  });
});
