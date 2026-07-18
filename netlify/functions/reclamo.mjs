// Libro de Reclamaciones: recibe el reclamo del formulario publico (JSON con
// adjuntos en base64), lo guarda en Supabase (tabla "reclamos" + bucket privado
// "reclamos") usando la SERVICE ROLE KEY —el navegador nunca escribe la tabla—
// y avisa por correo a legal@ y gerencia@ via SMTP de PrivateEmail (sin
// dependencias: cliente SMTP minimo sobre TLS).
//
// Env requeridas: SUPABASE_SERVICE_ROLE_KEY (guardar) y SMTP_PASS (avisar; si
// falta, el reclamo se guarda igual y solo se pierde el aviso).
import { connect } from 'node:tls';

const SUPABASE_URL = 'https://fwpuzvevenwhylryljjh.supabase.co';
const BUCKET = 'reclamos';
const SMTP_HOST = process.env.SMTP_HOST || 'mail.privateemail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_USER || 'reservas@lm-reps.com';
const MAIL_TO = ['legal@lm-reps.com', 'gerencia@lm-reps.com'];

const MAX_FILES = 3;
const MAX_FILE_BYTES = 3 * 1024 * 1024; // debe coincidir con el limite del formulario
const TIPOS_ADJUNTO = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

// Cliente SMTP minimo (AUTH LOGIN sobre TLS implicito, puerto 465). El cuerpo
// va en base64, asi que no hace falta dot-stuffing.
function smtpSend({ from, to, subject, html }) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST });
    let buf = '';
    let idx = 0;
    const fail = (msg) => { clearTimeout(timer); try { socket.destroy(); } catch {} reject(new Error(msg)); };
    // Corto: la funcion entera tiene 10 s de limite en Netlify, y si el correo
    // falla el reclamo ya quedo guardado igual.
    const timer = setTimeout(() => fail('smtp_timeout'), 6000);

    const payload = [
      `From: "Web LM-REPS" <${from}>`,
      `To: ${to.join(', ')}`,
      `Subject: =?UTF-8?B?${b64(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64(html).replace(/(.{76})/g, '$1\r\n'),
    ].join('\r\n');

    // Cada paso: codigo esperado de la respuesta anterior -> comando a enviar.
    const steps = [
      { expect: [220], send: 'EHLO lm-reps.com' },
      { expect: [250], send: 'AUTH LOGIN' },
      { expect: [334], send: b64(from) },
      { expect: [334], send: b64(process.env.SMTP_PASS) },
      { expect: [235], send: `MAIL FROM:<${from}>` },
      ...to.map((rcpt) => ({ expect: [250, 251], send: `RCPT TO:<${rcpt}>` })),
      { expect: [250, 251], send: 'DATA' },
      { expect: [354], send: payload + '\r\n.' },
      { expect: [250], send: 'QUIT' },
      { expect: [221], send: null },
    ];

    socket.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const lines = buf.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1];
      if (!last || !/^\d{3} /.test(last)) return; // respuesta multilinea incompleta
      const code = Number(last.slice(0, 3));
      buf = '';
      const step = steps[idx++];
      if (!step) return;
      if (!step.expect.includes(code)) return fail(`smtp_codigo_${code}_paso_${idx}`);
      if (step.send === null) { clearTimeout(timer); socket.end(); return resolve(); }
      socket.write(step.send + '\r\n');
    });
    socket.on('error', (e) => fail('smtp_conexion_' + (e.code || e.message)));
  });
}

// Fecha limite legal: 15 dias habiles desde la presentacion.
function fechaLimite(desde) {
  const d = new Date(desde);
  let habiles = 0;
  while (habiles < 15) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) habiles++;
  }
  return d;
}

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default async (req) => {
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SERVICE = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!SERVICE) return json({ error: 'service_key_no_configurada' }, 500);
  // Las llaves nuevas de Supabase (sb_secret_...) van solo en "apikey"; las
  // legacy (JWT eyJ...) ademas en Authorization. Soportamos ambas.
  const formato = SERVICE.startsWith('sb_secret_') ? 'sb_secret'
    : SERVICE.startsWith('sb_publishable_') ? 'sb_publishable_(ES_LA_EQUIVOCADA)'
    : SERVICE.startsWith('eyJ') ? 'jwt_legacy'
    : 'desconocido';
  if (formato !== 'sb_secret' && formato !== 'jwt_legacy')
    console.error('service key con formato inesperado:', formato, '| largo:', SERVICE.length);
  const auth = SERVICE.startsWith('sb_')
    ? { apikey: SERVICE }
    : { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

  let body;
  try { body = await req.json(); } catch { return json({ error: 'json_invalido' }, 400); }

  // Honeypot: a los bots se les responde "ok" sin guardar nada.
  if (body['bot-field']) return json({ ok: true, codigo: null });

  const clean = (v, max) => String(v ?? '').trim().slice(0, max);
  const nombre = clean(body.nombre, 120);
  const telefono = clean(body.telefono, 30);
  const detalle = clean(body.detalle, 2500);
  const tipo = clean(body.tipo, 60);
  if (!nombre || !telefono || !detalle || !tipo) return json({ error: 'faltan_campos' }, 400);

  // 1) Adjuntos al bucket privado (los invalidos se omiten sin frenar el reclamo)
  const adjuntos = [];
  const files = Array.isArray(body.adjuntos) ? body.adjuntos.slice(0, MAX_FILES) : [];
  const carpeta = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}`;
  for (const f of files) {
    const tipoF = clean(f?.tipo, 60);
    if (!TIPOS_ADJUNTO.includes(tipoF)) continue;
    let bytes;
    try { bytes = Buffer.from(String(f.base64 || ''), 'base64'); } catch { continue; }
    if (!bytes.length || bytes.length > MAX_FILE_BYTES) continue;
    const nombreF = (clean(f.nombre, 80).replace(/[^a-zA-Z0-9._-]/g, '_') || 'adjunto').replace(/^\.+/, '_');
    const path = `${carpeta}/${adjuntos.length + 1}-${nombreF}`;
    try {
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST', headers: { ...auth, 'content-type': tipoF }, body: bytes,
      });
      if (up.ok) adjuntos.push({ path, nombre: nombreF, tipo: tipoF, size: bytes.length });
      else console.error('upload_adjunto', up.status, await up.text());
    } catch (e) { console.error('upload_adjunto', e.message); }
  }

  // 2) Guardar el reclamo (esto SI es obligatorio; si falla, el formulario cae
  //    al respaldo de Netlify Forms)
  const ins = await fetch(`${SUPABASE_URL}/rest/v1/reclamos`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      tipo,
      nombre,
      dni: clean(body.dni, 30) || null,
      telefono,
      email: clean(body.email, 160) || null,
      detalle,
      respuesta_preferida: clean(body.respuesta, 30) || null,
      sucursal: clean(body.sucursal, 120) || null,
      adjuntos,
      ip: req.headers.get('x-nf-client-connection-ip') || null,
      user_agent: clean(req.headers.get('user-agent'), 300) || null,
    }),
  });
  if (!ins.ok) {
    console.error('insert_reclamo', ins.status, await ins.text());
    return json({ error: 'no_se_pudo_guardar' }, 502);
  }
  const [saved] = await ins.json();
  const codigo = `LR-${new Date(saved.created_at).getFullYear()}-${String(saved.numero).padStart(4, '0')}`;

  // 3) Aviso por correo (si falla, el reclamo ya quedo guardado y visible en el panel)
  let avisado = false;
  if (process.env.SMTP_PASS) {
    const limite = fechaLimite(saved.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
    const fila = (k, v) => (v ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap;">${k}</td><td style="padding:4px 0;">${esc(v)}</td></tr>` : '');
    try {
      await smtpSend({
        from: SMTP_USER,
        to: MAIL_TO,
        subject: `Reclamo ${codigo} — ${nombre}`,
        html: `
          <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;">
            <h2 style="color:#FA8232;margin-bottom:4px;">Nuevo reclamo ${codigo}</h2>
            <p style="margin-top:0;color:#c0392b;"><strong>Plazo legal de respuesta: ${limite}</strong> (15 días hábiles).</p>
            <table style="border-collapse:collapse;font-size:14px;">
              ${fila('Tipo', tipo)}${fila('Nombre', nombre)}${fila('Documento', body.dni)}
              ${fila('Teléfono', telefono)}${fila('Correo', body.email)}
              ${fila('Prefiere respuesta por', body.respuesta)}${fila('Sucursal', body.sucursal)}
              ${fila('Adjuntos', adjuntos.length ? `${adjuntos.length} archivo(s) — se ven en el panel` : '')}
            </table>
            <p style="background:#f7f7f7;border-left:4px solid #FA8232;padding:10px 14px;white-space:pre-wrap;">${esc(detalle)}</p>
            <p><a href="https://lm-reps.com/admin" style="background:#FA8232;color:#fff;text-decoration:none;padding:10px 22px;border-radius:24px;font-weight:600;">Atenderlo en el panel</a></p>
          </div>`,
      });
      avisado = true;
    } catch (e) { console.error('aviso_smtp', e.message); }
  } else {
    console.error('SMTP_PASS no configurada: reclamo guardado sin aviso por correo');
  }

  return json({ ok: true, codigo, avisado });
};
