const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPREADSHEET_ID = '1AYeleeFTj7rb1KLGnQp2eY1Ow5DOnV0kcGmueuPnbLs';
const SHEET_NAME = 'DIÁRIO DE AÇÃO DO APP';
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_sheets/v4';

const HEADERS = [
  'Mês',
  'Nome completo',
  'Credencial',
  'Trabalha no CEJAM?',
  'Categoria da ação',
  'Nome da ação',
  'Data da ação',
  'Horas',
  'Pessoas beneficiadas',
  'Local da ação',
  'Como foi a experiência',
  'Satisfação com a ação (0-5)',
  'Satisfação com a assistência (0-5)',
  'Foto (URL)',
];

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GOOGLE_SHEETS_API_KEY = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!LOVABLE_API_KEY || !GOOGLE_SHEETS_API_KEY) {
      return new Response(JSON.stringify({ ok: true, disabled: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      volunteer_name = '',
      volunteer_credential = '',
      works_at_cejam = false,
      category = '',
      action_name = '',
      action_date = '',
      donated_hours = '',
      people_impacted = '',
      location = '',
      description = '',
      satisfaction_action = '',
      satisfaction_support = '',
      photo_url = '',
    } = body || {};

    const headers = {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': GOOGLE_SHEETS_API_KEY,
    };

    // Ensure sheet tab exists + header row present
    const metaUrl = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`;
    const metaResp = await fetch(metaUrl, { headers });
    const metaData = await metaResp.json();
    if (!metaResp.ok) throw new Error(`Sheets meta failed [${metaResp.status}]: ${JSON.stringify(metaData)}`);

    const sheetExists = (metaData.sheets || []).some((s: any) => s.properties?.title === SHEET_NAME);
    if (!sheetExists) {
      const batchUrl = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}:batchUpdate`;
      const addResp = await fetch(batchUrl, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }),
      });
      const addData = await addResp.json();
      if (!addResp.ok) throw new Error(`Add sheet failed [${addResp.status}]: ${JSON.stringify(addData)}`);
    }

    // Check header row
    const headerRange = `${SHEET_NAME}!A1:N1`;
    const readUrl = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${headerRange}`;
    const readResp = await fetch(readUrl, { headers });
    const readData = await readResp.json();
    const existingHeader: string[] = readData?.values?.[0] || [];
    if (!existingHeader || existingHeader.length === 0) {
      const writeUrl = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${headerRange}?valueInputOption=USER_ENTERED`;
      await fetch(writeUrl, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: headerRange, majorDimension: 'ROWS', values: [HEADERS] }),
      });
    }

    // Compute month (PT-BR) from action_date
    let mes = '';
    if (action_date) {
      const d = new Date(action_date + 'T12:00:00');
      if (!isNaN(d.getTime())) mes = MESES[d.getMonth()];
    }

    const row = [
      mes,
      volunteer_name,
      volunteer_credential,
      works_at_cejam ? 'Sim' : 'Não',
      category,
      action_name,
      action_date,
      donated_hours,
      people_impacted,
      location,
      description,
      satisfaction_action,
      satisfaction_support,
      photo_url,
    ];

    const appendRange = `${SHEET_NAME}!A:N`;
    const appendUrl = `${GATEWAY_URL}/spreadsheets/${SPREADSHEET_ID}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const appResp = await fetch(appendUrl, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: appendRange, majorDimension: 'ROWS', values: [row] }),
    });
    const appData = await appResp.json();
    if (!appResp.ok) throw new Error(`Append failed [${appResp.status}]: ${JSON.stringify(appData)}`);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('sheet-action-diary error:', msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
