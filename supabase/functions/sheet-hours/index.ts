const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPREADSHEET_ID = '1AYeleeFTj7rb1KLGnQp2eY1Ow5DOnV0kcGmueuPnbLs';
const SHEET_NAME = 'BASE DE VOLUNTÁRIOS';
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_sheets/v4';

// In-memory cache (persists between warm invocations of the same edge worker)
const CACHE_TTL_MS = 5 * 60_000; // 5min — keeps us well under 300 reads/min quota across cold workers
let cache: { at: number; credCol: any[][]; hoursCol: any[][] } | null = null;
let inflight: Promise<{ credCol: any[][]; hoursCol: any[][] }> | null = null;

async function fetchSheet(LOVABLE_API_KEY: string, GOOGLE_SHEETS_API_KEY: string) {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return { credCol: cache.credCol, hoursCol: cache.hoursCol };
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const ranges = `ranges=${encodeURIComponent(`${SHEET_NAME}!C5:C`)}&ranges=${encodeURIComponent(`${SHEET_NAME}!AF5:AF`)}`;
    const url = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE`;

    // Retry with exponential backoff on 429/5xx
    let lastErr = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      const resp = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': GOOGLE_SHEETS_API_KEY,
        },
      });
      const data = await resp.json();
      if (resp.ok) {
        const credCol: any[][] = data.valueRanges?.[0]?.values ?? [];
        const hoursCol: any[][] = data.valueRanges?.[1]?.values ?? [];
        cache = { at: Date.now(), credCol, hoursCol };
        return { credCol, hoursCol };
      }
      lastErr = `Sheets API failed [${resp.status}]: ${JSON.stringify(data)}`;
      if (resp.status !== 429 && resp.status < 500) break;
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, attempt)));
    }
    // Serve stale cache if available, otherwise return empty (don't 500 the client)
    if (cache) return { credCol: cache.credCol, hoursCol: cache.hoursCol };
    console.error('sheet-hours fetch failed, returning empty:', lastErr);
    return { credCol: [], hoursCol: [] };
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_SHEETS_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!LOVABLE_API_KEY || !GOOGLE_SHEETS_API_KEY) {
      // Integração com planilha desativada — retorna sem erro
      return new Response(JSON.stringify({ hours: 0, found: false, disabled: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { credential } = await req.json();
    if (!credential || typeof credential !== 'string') {
      return new Response(JSON.stringify({ hours: 0, found: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const target = credential.trim().toLowerCase();
    const { credCol, hoursCol } = await fetchSheet(LOVABLE_API_KEY, GOOGLE_SHEETS_API_KEY);

    let hours = 0;
    let found = false;
    for (let i = 0; i < credCol.length; i++) {
      const cell = String(credCol[i]?.[0] ?? '').trim().toLowerCase();
      if (cell && cell === target) {
        const raw = hoursCol[i]?.[0];
        const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '0').replace(',', '.'));
        if (!isNaN(num)) hours = num;
        found = true;
        break;
      }
    }

    return new Response(JSON.stringify({ hours, found }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('sheet-hours error:', msg);
    return new Response(JSON.stringify({ error: msg, hours: 0, found: false }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
