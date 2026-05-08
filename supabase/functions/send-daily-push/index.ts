import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY =
  "BOk0HtqZC7lET_byiRXKBwE7tsfAXjEkq9mhILHCZFxtIuOOnU5UrdkoW2Hy2oqPzDgRe-7mZOkiL2tDX7bZUUQ";
const RAW_PRIVATE = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim().replace(/\s+/g, "");
const VAPID_PRIVATE_KEY = RAW_PRIVATE.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const VAPID_SUBJECT = "mailto:contato@diariodeacao.app";

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.error("setVapidDetails failed:", e);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const slot = (body as any).slot as "morning" | "evening" | undefined;

    let title = (body as any).title as string | undefined;
    let message = (body as any).message as string | undefined;

    if (!title || !message) {
      if (slot === "evening") {
        title = "Olá voluntário!";
        message = "Já registrou sua boa ação hoje?";
      } else {
        title = "Bom dia voluntário!";
        message = "O que você fará hoje para levar amor?";
      }
    }

    const { data: subs, error: subsErr } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");
    if (subsErr) throw subsErr;

    const payload = JSON.stringify({
      title,
      body: message,
      url: "/dashboard",
      tag: `daily-${slot ?? "msg"}`,
    });

    const results = await Promise.allSettled(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          return { id: s.id, ok: true };
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("id", s.id);
          }
          return { id: s.id, ok: false, error: e?.message };
        }
      }),
    );

    const sent = results.filter((r) => r.status === "fulfilled" && (r.value as any).ok).length;
    return new Response(JSON.stringify({ sent, total: subs?.length ?? 0, slot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("send-daily-push error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
