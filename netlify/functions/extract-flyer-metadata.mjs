// Autocompletar flyers con IA: recibe la URL de un afiche ya subido y le pide
// a Gemini (vision) que sugiera título, categoría, destino, país, duración,
// descripción y highlights. Solo sugiere -- la dueña revisa/edita y decide si
// guarda, igual que si lo hubiera escrito a mano. Solo un ADMIN autenticado
// puede llamarla: se valida el JWT de Supabase con el RPC public.is_admin().
// La clave de Gemini vive en la variable de entorno GEMINI_API_KEY (no se
// expone al navegador). Se usa el free tier de Gemini (sin costo).
const SUPABASE_URL = 'https://fwpuzvevenwhylryljjh.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3cHV6dmV2ZW53aHlscnlsampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MTU2NTEsImV4cCI6MjA5NzQ5MTY1MX0.y-6ki1zQNRHPNihrJ2rDyuBnb3FpkpzdBAm-6MH7wLw';

const CATEGORIES = ['carouselpromos', 'carouselnorteamerica', 'carouselcentroamerica', 'carouselsudamerica', 'carouselasia', 'carouseleuropa'];
const PAISES = ['peru', 'mexico', 'espana', 'estados-unidos', 'argentina', 'emiratos-arabes', 'china', 'japon', 'tailandia', 'italia'];

export default async (req) => {
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'no_token' }, 401);

  let isAdmin = false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: '{}',
    });
    isAdmin = r.ok && (await r.json()) === true;
  } catch (e) { isAdmin = false; }

  if (!isAdmin) return json({ error: 'forbidden' }, 403);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: 'gemini_api_key_no_configurado' }, 500);

  let imageUrl;
  try {
    ({ imageUrl } = await req.json());
  } catch (e) {
    return json({ error: 'body_invalido' }, 400);
  }
  if (!imageUrl) return json({ error: 'imageUrl_requerido' }, 400);

  let base64;
  let mediaType;
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return json({ error: 'no_se_pudo_descargar_imagen' }, 502);
    mediaType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imgRes.arrayBuffer();
    base64 = Buffer.from(buffer).toString('base64');
  } catch (e) {
    return json({ error: 'error_descargando_imagen' }, 502);
  }

  const prompt = `Eres un asistente para una agencia de viajes peruana. Analiza este afiche/flyer de un paquete turístico y devuelve SOLO un objeto JSON (sin texto adicional, sin markdown) con esta forma exacta:
{
  "title": "nombre del paquete/destino, corto y atractivo",
  "category": "una de estas opciones exactas: ${CATEGORIES.join(', ')}",
  "destino": "país o ciudad visible en el afiche",
  "pais": "una de estas opciones exactas o null si ninguna aplica: ${PAISES.join(', ')}",
  "duration": "duración del viaje si aparece en el afiche, ej: '13 días / 10 noches', o null si no aparece",
  "description": "frase corta que resuma el viaje, máximo 120 caracteres",
  "highlights": ["punto destacado 1", "punto destacado 2", "punto destacado 3"]
}
"category" debe elegirse según la región del destino (Norteamérica, Caribe/Centroamérica, Sudamérica, Asia o Europa); usa "carouselpromos" solo si es una promoción general que no calza claramente en una región.`;

  try {
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mediaType, data: base64 } },
            ],
          }],
        }),
      }
    );

    if (!aiRes.ok) {
      const errBody = await aiRes.text();
      return json({ error: 'gemini_api_error', status: aiRes.status, detail: errBody.slice(0, 300) }, 502);
    }

    const aiData = await aiRes.json();
    const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: 'parse_failed' }, 502);

    const suggestion = JSON.parse(match[0]);
    return json(suggestion);
  } catch (e) {
    return json({ error: 'parse_failed' }, 502);
  }
};
