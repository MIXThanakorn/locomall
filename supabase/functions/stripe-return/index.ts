import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve((req) => {
  const id = new URL(req.url).searchParams.get("order");
  if (!id || !/^\d{1,15}$/.test(id))
    return new Response("Invalid order", { status: 400 });
  // Supabase's default function domain serves HTML as plain text. Redirect instead;
  // the destination still checks ownership and payment state from the backend.
  return new Response(null, {
    status: 302,
    headers: {
      Location: `locomall://order/${id}`,
      "Cache-Control": "no-store",
    },
  });
});
