import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = "BD94_LTYgiwVqLkpBgIl2CbAYCQORjeEAnO_nC1VAvroScgq8GhDEMXHkuAAvuHxD0P9UW0kVLpjktGUy0kXWDo";
const RAW = (Deno.env.get("VAPID_PRIVATE_KEY") ?? "").trim().replace(/\s+/g, "");
const VAPID_PRIVATE_KEY = RAW.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

try { webpush.setVapidDetails("mailto:contato@diariodeacao.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY); } catch (e) { console.error(e); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const today = new Date().toISOString().split("T")[0];

    const { data: slots } = await admin.from("welcome_meeting_slots").select("id, slot_date, slot_time").eq("slot_date", today);
    if (!slots?.length) return new Response(JSON.stringify({ sent: 0, reason: "no slots today" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const slotIds = slots.map((s) => s.id);
    const slotMap = new Map(slots.map((s) => [s.id, s]));

    const { data: bookings } = await admin
      .from("welcome_meeting_bookings")
      .select("id, slot_id, registration_id, volunteer_email")
      .in("slot_id", slotIds)
      .is("reminder_sent_at", null);

    let sent = 0;
    for (const b of bookings || []) {
      const slot = slotMap.get(b.slot_id)!;
      const time = (slot.slot_time as string).slice(0, 5);
      const body = `Sua reunião de boas vindas é hoje às ${time}`;

      // Find user with same email/cpf to push
      let userId: string | null = null;
      if (b.registration_id) {
        const { data: reg } = await admin.from("volunteer_registrations").select("email, cpf").eq("id", b.registration_id).maybeSingle();
        if (reg) {
          const { data: profile } = await admin.from("profiles").select("id").or(`email.eq.${reg.email},cpf.eq.${reg.cpf}`).limit(1).maybeSingle();
          if (profile) userId = profile.id;
        }
      }

      if (userId) {
        const { data: subs } = await admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
        const payload = JSON.stringify({ title: "Reunião de Boas Vindas", body, url: "/minha-jornada", tag: `welcome-${b.id}` });
        await Promise.allSettled((subs ?? []).map((s) =>
          webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload).catch(() => null)
        ));
        sent++;
      }

      await admin.from("welcome_meeting_bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
    }

    return new Response(JSON.stringify({ sent, total: bookings?.length ?? 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message ?? "error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
