export type ChatMessage = { message_id: number; sender_id: string; message: string; created_at: string };
export function mergeChatMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map((message) => [message.message_id, message]));
  for (const message of incoming) byId.set(message.message_id, message);
  return [...byId.values()].sort((a, b) => {
    // Retain the original microsecond cursor rather than round-tripping via Date.
    const at = a.created_at.replace("Z", "+00:00");
    const bt = b.created_at.replace("Z", "+00:00");
    return at < bt ? -1 : at > bt ? 1 : a.message_id - b.message_id;
  });
}
