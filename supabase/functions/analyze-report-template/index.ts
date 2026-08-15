import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MODELS = ['google/gemini-3.6-flash', 'google/gemini-2.5-flash'];

const SYSTEM = `You analyse school report-card templates (a PDF or an image of a blank/sample report card).
Return the list of DATA FIELDS that must be filled in on the template, with the position of the blank area
where each value should be printed.

Rules:
- Coordinates are normalised 0..1 relative to the page (x,y = top-left corner of the value area).
- Only return places where a VALUE goes, never the printed labels themselves.
- Match a field to one of the provided system field keys when the meaning is the same.
  If nothing matches, set "systemField" to null and invent a snake_case "key".
- For each field give a short human "label" exactly as printed on the template.
- Keep the reading order of the template.
- Ignore the subject marks table rows: instead return a single field with systemField "marks_table"
  covering the whole table area if a marks table exists.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null);
    const fileBase64: string = body?.fileBase64;
    const mimeType: string = body?.mimeType;
    const availableFields: { key: string; label: string }[] = body?.availableFields ?? [];

    if (!fileBase64 || typeof fileBase64 !== 'string' || fileBase64.length < 100) {
      return json({ error: 'A template file is required' }, 400);
    }
    if (!mimeType || !/^(application\/pdf|image\/(png|jpe?g|webp))$/.test(mimeType)) {
      return json({ error: 'Only PDF, PNG, JPG or WEBP templates are supported' }, 400);
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'AI is not configured' }, 500);

    const dataUrl = `data:${mimeType};base64,${fileBase64}`;
    const content = mimeType === 'application/pdf'
      ? [
          { type: 'text', text: prompt(availableFields) },
          { type: 'file', file: { filename: 'template.pdf', file_data: dataUrl } },
        ]
      : [
          { type: 'text', text: prompt(availableFields) },
          { type: 'image_url', image_url: { url: dataUrl } },
        ];

    let lastError = 'AI request failed';
    for (const model of MODELS) {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': apiKey },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content },
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'report_template_fields',
              description: 'The data fields detected on the report card template',
              parameters: {
                type: 'object',
                properties: {
                  pageWidthMm: { type: 'number' },
                  pageHeightMm: { type: 'number' },
                  fields: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        key: { type: 'string' },
                        label: { type: 'string' },
                        systemField: { type: ['string', 'null'] },
                        x: { type: 'number' },
                        y: { type: 'number' },
                        w: { type: 'number' },
                        h: { type: 'number' },
                        align: { type: 'string', enum: ['left', 'center', 'right'] },
                      },
                      required: ['key', 'label', 'x', 'y', 'w', 'h'],
                    },
                  },
                },
                required: ['fields'],
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'report_template_fields' } },
        }),
      });

      if (res.status === 429) return json({ error: 'AI rate limit reached, please retry shortly.' }, 429);
      if (res.status === 402) return json({ error: 'AI credits exhausted. Add credits to continue.' }, 402);
      if (!res.ok) { lastError = await res.text(); continue; }

      const data = await res.json();
      const call = data?.choices?.[0]?.message?.tool_calls?.[0];
      const args = call?.function?.arguments;
      if (!args) { lastError = 'AI returned no fields'; continue; }
      const parsed = JSON.parse(args);
      return json({
        pageWidthMm: Number(parsed.pageWidthMm) || 210,
        pageHeightMm: Number(parsed.pageHeightMm) || 297,
        fields: Array.isArray(parsed.fields) ? parsed.fields : [],
      }, 200);
    }

    console.error('analyze-report-template failed:', lastError);
    return json({ error: 'Could not analyse the template. Try a clearer PDF or image.' }, 502);
  } catch (e) {
    console.error(e);
    return json({ error: 'Unexpected error analysing the template' }, 500);
  }
});

function prompt(fields: { key: string; label: string }[]) {
  return `Available system field keys (use these when the template field means the same thing):\n` +
    fields.map((f) => `- ${f.key}: ${f.label}`).join('\n') +
    `\n\nAnalyse the attached report card template and return every fillable field.`;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
