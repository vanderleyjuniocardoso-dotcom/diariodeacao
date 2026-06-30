import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPREADSHEET_ID = "1IiBUhHyXbq4h_PM2dxwAge3r8A3RpBGxfLa8OniEN2g";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const HEADERS = [
  "Mês", "Data", "Nome do Voluntário", "CPF", "Credencial",
  "Colaborador CEJAM", "N° de Beneficiários", "Horas",
  "Tipo de Ação", "Nome da Ação", "Registrado em",
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

// Sanitize unit name to a valid Google Sheets tab name (max 100 chars, no : \ / ? * [ ])
function sanitizeTabName(name: string): string {
  const cleaned = name.replace(/[:\\/?*\[\]]/g, " ").trim();
  return cleaned.slice(0, 95) || "GGL";
}

async function ensureSheet(tabName: string): Promise<void> {
  // Check if sheet exists
  const meta = await gw(`/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`);
  const exists = (meta.sheets || []).some((s: any) => s.properties?.title === tabName);
  if (!exists) {
    await gw(`/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: tabName } } }],
      }),
    });
  }
  // Ensure headers in row 1
  const range = `${tabName}!A1:K1`;
  const data = await gw(`/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(tabName)}!A1:K1`);
  const row = data.values?.[0] || [];
  if (row.length === 0 || row[0] !== HEADERS[0]) {
    await gw(
      `/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(tabName)}!A1:K1?valueInputOption=USER_ENTERED`,
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
    const { report_id } = await req.json();
    if (!report_id) throw new Error("report_id obrigatório");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: r, error } = await supabase
      .from("ggl_action_reports")
      .select("*")
      .eq("id", report_id)
      .maybeSingle();
    if (error) throw error;
    if (!r) throw new Error("Reporte não encontrado");

    const { data: g, error: gErr } = await supabase
      .from("ggl_groups")
      .select("unit_name")
      .eq("id", r.ggl_id)
      .maybeSingle();
    if (gErr) throw gErr;
    if (!g) throw new Error("GGL não encontrado");

    const tabName = sanitizeTabName(g.unit_name);
    await ensureSheet(tabName);

    const TZ = "America/Sao_Paulo";
    const actionDate = new Date(r.action_date + "T12:00:00");
    const parts = new Intl.DateTimeFormat("pt-BR", {
      timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric",
    }).formatToParts(actionDate).reduce((acc: Record<string, string>, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    const mes = MONTHS_PT[parseInt(parts.month, 10) - 1];
    const dataAcao = `${parts.day}/${parts.month}/${parts.year}`;

    const createdParts = new Intl.DateTimeFormat("pt-BR", {
      timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(r.created_at));

    const row = [
      `'${mes}`,
      `'${dataAcao}`,
      r.volunteer_name || "",
      `'${r.volunteer_cpf || ""}`,
      `'${r.volunteer_credential || ""}`,
      r.is_cejam_collaborator ? "Sim" : "Não",
      Number(r.beneficiaries_count) || 0,
      Number(r.hours) || 0,
      r.action_type || "",
      r.action_name || "",
      createdParts,
    ];

    const appendRange = `${tabName}!A1`;
    await gw(
      `/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ range: appendRange, majorDimension: "ROWS", values: [row] }) }
    );

    return new Response(JSON.stringify({ ok: true, tab: tabName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e: any) {
    console.error("sync-ggl-report-to-sheet", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
