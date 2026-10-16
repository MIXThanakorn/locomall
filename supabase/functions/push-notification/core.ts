export type PushJob = {
  job_id: number; notification_id: number; push_device_id: number; user_id: string;
  registration_version: string; ticket_id: string | null; attempts: number; receipt_checks: number; created_at: string;
};
export type Ticket = { status?: string; id?: string; details?: { error?: string } };
export function retryAt(attempt: number, now = Date.now()) {
  return new Date(now + Math.min(3600, 30 * 2 ** Math.min(attempt, 7)) * 1000).toISOString();
}
export function ticketOutcome(ticket: Ticket | undefined, attempts: number) {
  if (ticket?.status === "ok" && typeof ticket.id === "string") return { status: "accepted", ticket_id: ticket.id, last_error: null };
  const reason = ticket?.details?.error ?? "missing_ticket";
  return { status: reason === "MessageRateExceeded" && attempts < 5 ? "pending" : "failed", last_error: reason };
}
export function currentRegistration(job: PushJob, device: { user_id: string; enabled: boolean; registration_version: string } | null) {
  return !!device && device.enabled && device.user_id === job.user_id && device.registration_version === job.registration_version;
}
