const subscriptionSessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

let subscriptionSequence = 0;

export function createRealtimeChannelTopic(
  scope: string,
  entityId: string,
): string {
  subscriptionSequence += 1;

  return `${scope}:${entityId}:${subscriptionSessionId}:${subscriptionSequence.toString(36)}`;
}
