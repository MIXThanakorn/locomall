let subscriptionSequence = 0;
// A module reload must not reuse topics belonging to pre-refresh effects.
const channelInstance = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// Supabase reuses a channel with an identical topic. Each effect owns its own
// subscription, including stacked screens and an old async cleanup in flight.
export function realtimeChannelName(scope: string): string {
  subscriptionSequence += 1;
  return `${scope}:subscription-${channelInstance}-${subscriptionSequence}`;
}
