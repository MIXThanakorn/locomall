const thaiDateTime = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatThaiDateTime(value?: string | null) {
  if (!value) return "ไม่ระบุวันที่";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "ไม่ระบุวันที่" : thaiDateTime.format(date);
}
