// "Publicar cambios": dispara un rebuild de Netlify (Build Hook) para regenerar
// las páginas estáticas de paquete desde la base. Solo un ADMIN autenticado
// puede llamarla: se valida el JWT de Supabase con el RPC public.is_admin().
// La URL del Build Hook vive en la variable de entorno BUILD_HOOK_URL (no se
// expone al navegador).
const SUPABASE_URL = 'https://fwpuzvevenwhylryljjh.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3cHV6dmV2ZW53aHlscnlsampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MTU2NTEsImV4cCI6MjA5NzQ5MTY1MX0.y-6ki1zQNRHPNihrJ2rDyuBnb3FpkpzdBAm-6MH7wLw';

export default async (req) => {
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'no_token' }, 401);

  // Validar admin con el mismo RPC que usan las políticas RLS.
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

  const hook = process.env.BUILD_HOOK_URL;
  if (!hook) return json({ error: 'build_hook_no_configurado' }, 500);

  try {
    const b = await fetch(hook, { method: 'POST' });
    if (!b.ok) return json({ error: 'build_hook_failed', status: b.status }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ error: 'build_hook_error' }, 502);
  }
};
