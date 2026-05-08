const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPREADSHEET_ID = '1AYeleeFTj7rb1KLGnQp2eY1Ow5DOnV0kcGmueuPnbLs';
const SHEET_NAME = 'Base de voluntários';
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_sheets/v4';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_SHEETS_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
    if (!GOOGLE_SHEETS_API_KEY) throw new Error('GOOGLE_SHEETS_API_KEY is not configured');

    const { credential, hours } = await req.json();
    if (!credential || typeof credential !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'credential required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const addHours = typeof hours === 'number' ? hours : parseFloat(String(hours ?? '0').replace(',', '.'));
    if (!isFinite(addHours) || addHours === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid hours' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const target = credential.trim().toLowerCase();

    const headers = {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GOOGLE_SHEETS_API_KEY,
    };

    // Read credential column C and current AH values
    const ranges = `ranges=${encodeURIComponent(`${SHEET_NAME}!C5:C`)}&ranges=${encodeURIComponent(`${SHEET_NAME}!AH5:AH`)}`;
    const readUrl = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE`;
    const readResp = await fetch(readUrl, { headers });
    const readData = await readResp.json();
    if (!readResp.ok) throw new Error(`Sheets read failed [${readResp.status}]: ${JSON.stringify(readData)}`);

    const credCol: any[][] = readData.valueRanges?.[0]?.values ?? [];
    const agCol: any[][] = readData.valueRanges?.[1]?.values ?? [];

    let foundIdx = -1;
    for (let i = 0; i < credCol.length; i++) {
      const cell = String(credCol[i]?.[0] ?? '').trim().toLowerCase();
      if (cell && cell === target) { foundIdx = i; break; }
    }

    if (foundIdx === -1) {
      return new Response(JSON.stringify({ ok: false, found: false, error: 'credential not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rowNumber = foundIdx + 5; // sheet starts at row 5
    const currentRaw = agCol[foundIdx]?.[0];
    const current = typeof currentRaw === 'number'
      ? currentRaw
      : parseFloat(String(currentRaw ?? '0').replace(',', '.')) || 0;
    const newValue = current + addHours;

    const writeRange = `${SHEET_NAME}!AH${rowNumber}`;
    const writeUrl = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${writeRange}?valueInputOption=USER_ENTERED`;
    const writeResp = await fetch(writeUrl, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: writeRange, majorDimension: 'ROWS', values: [[newValue]] }),
    });
    const writeData = await writeResp.json();
    if (!writeResp.ok) throw new Error(`Sheets write failed [${writeResp.status}]: ${JSON.stringify(writeData)}`);

    return new Response(JSON.stringify({ ok: true, found: true, row: rowNumber, previous: current, added: addHours, newValue }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('sheet-add-hours error:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
