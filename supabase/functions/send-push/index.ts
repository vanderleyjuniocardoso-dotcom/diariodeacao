import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY =
  "BC1vD_6NsjJ7DEl8l4CRU5nj20RCZwTjv5aQcuJeIWZbYoKWrzQAdckKVu8kBJm272S9bPyLpf2jK-E_qCJDUK8";
// Sanitize: strip whitespace/newlines and convert standard base64 to base64url if needed
const RAW_PRIVATE = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim().replace(/\s+/g, "");
const VAPID_PRIVATE_KEY = RAW_PRIVATE.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const VAPID_SUBJECT = "mailto:contato@diariodeacao.app";

console.log("VAPID private key length:", VAPID_PRIVATE_KEY.length);

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.error("setVapidDetails failed:", e);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const senderId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { recipient_id, title, message, url } = body as {
      recipient_id?: string;
      title?: string;
      message?: string;
      url?: string;
    };

    if (!recipient_id || !message) {
      return new Response(JSON.stringify({ error: "recipient_id and message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: subs, error: subsErr } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", recipient_id);

    if (subsErr) throw subsErr;

    const payload = JSON.stringify({
      title: title || "Nova mensagem",
      body: message.slice(0, 200),
      url: url || "/",
      tag: `msg-${senderId}`,
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
          // Remove subscriptions that are gone (404/410)
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("id", s.id);
          }
          return { id: s.id, ok: false, error: e?.message };
        }
      }),
    );

    const sent = results.filter((r) => r.status === "fulfilled" && (r.value as any).ok).length;

    return new Response(JSON.stringify({ sent, total: subs?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("send-push error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
