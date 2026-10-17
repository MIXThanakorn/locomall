const thaiDateTime = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatThaiDateTime(value?: string | null) {
  if (!value) return "ไม่ระบุวันที่";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "ไม่ระบุวันที่" : thaiDateTime.format(date);
}

const chatDateTime = new Intl.DateTimeFormat("en-GB", {
  calendar: "gregory", numberingSystem: "latn", day: "2-digit", month: "2-digit", year: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** Short Gregorian date in the device's local timezone, shared by all chat surfaces. */
export function formatChatDateTime(value?: string | null) {
  if (!value) return "ไม่ระบุวันที่";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ไม่ระบุวันที่";
  const parts = Object.fromEntries(chatDateTime.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}
