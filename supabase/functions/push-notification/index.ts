import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { currentRegistration, retryAt, ticketOutcome, type PushJob, type Ticket } from "./core.ts";

function adminKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  return keys ? JSON.parse(keys).default as string : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}
function isWebhookRequest(request: Request) {
  const secret = Deno.env.get("LOCOMALL_PUSH_WEBHOOK_SECRET");
  return !!secret && request.headers.get("x-locomall-webhook-secret") === secret;
}
Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  // verify_jwt=false: every call requires the private Vault webhook secret.
  if (!isWebhookRequest(request)) return new Response("Unauthorized", { status: 401 });
  try {
    const payload = await request.json();
    if (payload.type !== "DRAIN" && !(payload.type === "INSERT" && payload.schema === "public" && payload.table === "notifications" && Number.isSafeInteger(Number(payload.record?.notification_id)))) return Response.json({ skipped: true });
    const db = createClient(Deno.env.get("SUPABASE_URL")!, adminKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, init) => fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(15000) }) },
    });
    const { data, error } = await db.rpc("claim_push_delivery_jobs", { p_limit: 100 });
    if (error) throw error;
    const jobs = (data ?? []) as PushJob[];
    if (!jobs.length) return Response.json({ processed: 0 });
    const save = async (job: PushJob, patch: Record<string, unknown>) => {
      const { error } = await db.from("push_delivery_jobs").update({ ...patch, lease_until: null, updated_at: new Date().toISOString() })
        .eq("job_id", job.job_id).eq("status", job.ticket_id ? "checking" : "sending");
      if (error) throw error;
    };
    const deviceError = async (job: PushJob, reason: string) => {
      // A late result cannot enable a logged-out device or alter a newer owner.
      const { error } = await db.from("user_push_devices").update({ enabled: false, last_error: reason })
        .eq("push_device_id", job.push_device_id).eq("user_id", job.user_id).eq("registration_version", job.registration_version);
      if (error) throw error;
    };
    const [devices, notifications] = await Promise.all([
      db.from("user_push_devices").select("push_device_id,user_id,enabled,registration_version,expo_push_token").in("push_device_id", jobs.map(j => j.push_device_id)),
      db.from("notifications").select("notification_id,user_id,title,body,category,entity_type,entity_id").in("notification_id", jobs.map(j => j.notification_id)),
    ]);
    if (devices.error || notifications.error) {
      for (const job of jobs) await save(job, { status: job.ticket_id ? "accepted" : job.attempts < 5 ? "pending" : "failed", next_attempt_at: retryAt(job.attempts), last_error: "context_unavailable" });
      throw new Error("context unavailable");
    }
    const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");
    const headers = { "Content-Type": "application/json", ...(expoToken ? { Authorization: "Bearer " + expoToken } : {}) };
    const sending: { job: PushJob; message: Record<string, unknown> }[] = [];
    const checking: PushJob[] = [];
    for (const job of jobs) {
      const device = devices.data?.find(d => d.push_device_id === job.push_device_id) ?? null;
      const notification = notifications.data?.find(n => n.notification_id === job.notification_id);
      if (!currentRegistration(job, device) || !notification || notification.user_id !== job.user_id) {
        await save(job, { status: "cancelled" }); continue;
      }
      if (job.ticket_id) { checking.push(job); continue; }
      sending.push({ job, message: { to: device!.expo_push_token, sound: "default", title: notification.title, body: notification.body,
        channelId: "locomall-updates", priority: "high",
        data: { notification_id: notification.notification_id, category: notification.category, entity_type: notification.entity_type, entity_id: notification.entity_id } } });
    }
    if (sending.length) {
      // <=100 messages. A transport timeout is ambiguous and is NOT blindly retried.
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST", headers, body: JSON.stringify(sending.map(e => e.message)), signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
          for (const { job } of sending) await save(job, {
            status: (response.status === 429 || response.status >= 500) && job.attempts < 5 ? "pending" : "failed",
            next_attempt_at: retryAt(job.attempts), last_error: "provider_http_" + response.status,
          });
        } else {
          const result = await response.json();
          const tickets: Ticket[] = Array.isArray(result.data) ? result.data : [];
          for (let i = 0; i < sending.length; i++) {
            const { job } = sending[i]; const outcome = ticketOutcome(tickets[i], job.attempts);
            await save(job, { ...outcome, next_attempt_at: outcome.status === "accepted" ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : retryAt(job.attempts) });
            if (outcome.last_error === "DeviceNotRegistered") await deviceError(job, outcome.last_error);
          }
        }
      } catch {
        for (const { job } of sending) await save(job, { status: "uncertain", last_error: "send_outcome_unknown" });
      }
    }
    if (checking.length) {
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
          method: "POST", headers, body: JSON.stringify({ ids: checking.map(j => j.ticket_id) }), signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error("receipt unavailable");
        const result = await response.json();
        for (const job of checking) {
          const receipt: Ticket | undefined = result.data?.[job.ticket_id!];
          if (receipt?.status === "ok") {
            await save(job, { status: "delivered", last_error: null });
            // Provider receipt is not proof that a human read the notification.
            await db.from("user_push_devices").update({ last_success_at: new Date().toISOString(), last_error: null })
              .eq("push_device_id", job.push_device_id).eq("user_id", job.user_id).eq("registration_version", job.registration_version).eq("enabled", true);
          } else if (receipt?.status === "error") {
            const reason = receipt.details?.error ?? "receipt_error";
            await save(job, { status: "failed", last_error: reason });
            if (reason === "DeviceNotRegistered") await deviceError(job, reason);
          } else await save(job, { status: job.receipt_checks < 12 ? "accepted" : "failed", next_attempt_at: retryAt(job.receipt_checks), last_error: "receipt_not_ready" });
        }
      } catch {
        for (const job of checking) await save(job, { status: job.receipt_checks < 12 ? "accepted" : "failed", next_attempt_at: retryAt(job.receipt_checks), last_error: "receipt_unavailable" });
      }
    }
    return Response.json({ processed: jobs.length, submitted: sending.length, receiptsChecked: checking.length });
  } catch {
    console.warn("push-worker: internal_error");
    return Response.json({ error: "push worker unavailable" }, { status: 500 });
  }
});
