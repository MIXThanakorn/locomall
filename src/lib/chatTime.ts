const ONE_HOUR_MS = 60 * 60 * 1000;
const thaiClock = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" });

export function formatChatClock(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : thaiClock.format(date);
}

export function shouldShowChatTimeDivider(messages: readonly { created_at: string }[], index: number) {
  if (index === 0) return true;
  const current = new Date(messages[index].created_at).getTime();
  const previous = new Date(messages[index - 1].created_at).getTime();
  return Number.isFinite(current) && Number.isFinite(previous) && current - previous > ONE_HOUR_MS;
}
