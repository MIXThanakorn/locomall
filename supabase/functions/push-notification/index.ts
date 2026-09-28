import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type NotificationRecord = {
  notification_id: number;
  user_id: string;
  category: "order" | "approval" | "chat" | "system";
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: number | null;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: NotificationRecord | null;
};

function adminKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) return JSON.parse(keys).default as string;
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

function isServiceRequest(request: Request) {
  const configured = Deno.env.get("SUPABASE_SECRET_KEYS");
  const secretKeys = configured ? Object.values(JSON.parse(configured)) as string[] : [];
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) secretKeys.push(legacy);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const apiKey = request.headers.get("apikey");
  return secretKeys.some((key) => key === bearer || key === apiKey);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  // The database webhook must use a Supabase service/secret key. A normal app
  // session or public anon key must never be able to send arbitrary Push text.
  if (!isServiceRequest(request)) return new Response("Unauthorized", { status: 401 });
  const payload = await request.json() as WebhookPayload;
  const notification = payload.record;
  if (payload.type !== "INSERT" || payload.schema !== "public" || payload.table !== "notifications" || !notification) {
    return Response.json({ skipped: true });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, adminKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: devices, error } = await supabase
    .from("user_push_devices")
    .select("push_device_id,expo_push_token")
    .eq("user_id", notification.user_id)
    .eq("enabled", true);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!devices?.length) return Response.json({ sent: 0 });

  const messages = devices.map((device) => ({
    to: device.expo_push_token,
    sound: "default",
    title: notification.title,
    body: notification.body,
    channelId: "locomall-updates",
    priority: "high",
    data: {
      notification_id: notification.notification_id,
      category: notification.category,
      entity_type: notification.entity_type,
      entity_id: notification.entity_id,
    },
  }));
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  const result = await response.json();
  if (!response.ok) return Response.json(result, { status: response.status });

  const tickets = Array.isArray(result.data) ? result.data : [];
  await Promise.all(devices.map((device, index) => {
    const ticket = tickets[index];
    const invalid = ticket?.status === "error" && ticket?.details?.error === "DeviceNotRegistered";
    return supabase.from("user_push_devices").update({
      enabled: invalid ? false : true,
      last_success_at: ticket?.status === "ok" ? new Date().toISOString() : null,
      last_error: ticket?.status === "error" ? String(ticket.message ?? "push failed").slice(0, 500) : null,
      updated_at: new Date().toISOString(),
    }).eq("push_device_id", device.push_device_id);
  }));

  return Response.json({ sent: tickets.filter((ticket: { status?: string }) => ticket.status === "ok").length });
});
