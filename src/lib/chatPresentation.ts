type Message = { sender_id: string; created_at: string };
/** Group only consecutive messages from the same sender within five minutes. */
export function sameChatGroup(previous?: Message, current?: Message) {
  if (!previous || !current || previous.sender_id !== current.sender_id) return false;
  const gap = Date.parse(current.created_at) - Date.parse(previous.created_at);
  return Number.isFinite(gap) && gap >= 0 && gap < 5 * 60 * 1000;
}
export function chatIsNearBottom(offset: number, viewport: number, content: number) {
  return content - offset - viewport < 80;
}
