import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPREADSHEET_ID = "1AYeleeFTj7rb1KLGnQp2eY1Ow5DOnV0kcGmueuPnbLs";
const SHEET_NAME = "NOVOS VOLUNTÁRIOS";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const HEADERS = [
  "Mês do Cadastro","Data do Cadastro","Credencial","Nome completo","Nome social","WhatsApp","E-mail",
  "Gênero","Data de nascimento","RG","CPF","Estado civil","Município","Bairro",
  "Rua, número ou complemento","Escolaridade","Área de atuação","Profissão",
  "Trabalha no CEJAM","Unidade do CEJAM","Como conheceu o programa","Tamanho da camiseta",
  "Unidade para envio do Kit","Aceitou os termos","Foto"
];

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

async function gw(path: string, init: RequestInit = {}) {
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  const GS = Deno.env.get("GOOGLE_SHEETS_API_KEY");
  if (!LOVABLE || !GS) throw new Error("Missing gateway credentials");
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE}`,
      "X-Connection-Api-Key": GS,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Sheets ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

async function ensureHeaders() {
  const range = `${SHEET_NAME}!A1:AA1`;
  const data = await gw(`/spreadsheets/${SPREADSHEET_ID}/values/${range}`);
  const row = data.values?.[0] || [];
  if (row.length === 0 || !row.includes("Credencial")) {
    await gw(
      `/spreadsheets/${SPREADSHEET_ID}/values/${range}?valueInputOption=USER_ENTERED`,
      { method: "PUT", body: JSON.stringify({ range, majorDimension: "ROWS", values: [HEADERS] }) }
    );
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!Deno.env.get("GOOGLE_SHEETS_API_KEY") || !Deno.env.get("LOVABLE_API_KEY")) {
      return new Response(JSON.stringify({ ok: true, disabled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }
    const { registration_id } = await req.json();
    if (!registration_id) throw new Error("registration_id obrigatório");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: r, error } = await supabase
      .from("volunteer_registrations").select("*").eq("id", registration_id).maybeSingle();
    if (error) throw error;
    if (!r) throw new Error("Cadastro não encontrado");

    // Ensure entry in base autorizada (admin_volunteers) with nome, CPF e credencial
    const { data: av, error: avError } = await supabase
      .from("admin_volunteers")
      .select("credencial")
      .eq("cpf", r.cpf)
      .maybeSingle();
    if (avError) throw avError;

    let credencial = av?.credencial || "";
    if (!credencial) {
      const { data: nc, error: ncErr } = await supabase.rpc("next_credential");
      if (ncErr) throw ncErr;
      credencial = (nc as string) || "";
    }

    const { error: upErr } = await supabase
      .from("admin_volunteers")
      .upsert(
        { cpf: r.cpf, full_name: r.full_name, credencial, source: "auto" },
        { onConflict: "cpf" }
      );
    if (upErr) throw upErr;

    await ensureHeaders();

    const created = new Date(r.created_at);
    const TZ = "America/Sao_Paulo";
    const parts = new Intl.DateTimeFormat("pt-BR", {
      timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric",
    }).formatToParts(created).reduce((acc: Record<string, string>, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    const mes = MONTHS_PT[parseInt(parts.month, 10) - 1];
    const dataCad = `${parts.day}/${parts.month}/${parts.year}`;
    const photo = r.photo_url ? `=IMAGE("${r.photo_url}")` : "";

    const row = [
      `'${mes}`, `'${dataCad}`, `'${credencial}`, r.full_name || "", r.social_name || "", `'${r.whatsapp || ""}`, r.email || "",
      r.gender || "", r.birth_date || "", r.rg || "", r.cpf || "", r.marital_status || "",
      r.city || "", r.neighborhood || "", r.address || "", r.education || "",
      r.area_of_work || "", r.profession || "", r.works_at_cejam ? "Sim" : "Não",
      r.cejam_unit || "", r.how_found_program || "", r.shirt_size || "", r.kit_unit || "",
      r.agreed_terms ? "Sim" : "Não", photo,
    ];

    const appendRange = `${SHEET_NAME}!A1`;
    await gw(
      `/spreadsheets/${SPREADSHEET_ID}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ range: appendRange, majorDimension: "ROWS", values: [row] }) }
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e: any) {
    console.error("sync-volunteer-to-sheet", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
