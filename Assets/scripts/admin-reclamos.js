// Pestaña "Reclamos" del panel: lista la tabla "reclamos" (Libro de
// Reclamaciones), con semáforo del plazo legal de 15 días hábiles, cambio de
// estado y adjuntos del bucket privado vía URL firmada.
import { supabase } from './supabase-client.js';
import { requireAdmin } from './auth-guard.js';

const tableBody = document.getElementById('reclamosTableBody');
const estadoFilter = document.getElementById('reclamosEstadoFilter');
const badge = document.getElementById('reclamosBadge');

const ESTADOS = { pendiente: 'Pendiente', en_atencion: 'En atención', respondido: 'Respondido' };

let porId = new Map(); // cache de la última carga, para el modal de detalle

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function waLink(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 9) d = '51' + d; // celular peruano sin prefijo
  return d ? 'https://wa.me/' + d : null;
}

const codigoDe = (r) => `LR-${new Date(r.created_at).getFullYear()}-${String(r.numero).padStart(4, '0')}`;

// Plazo legal: 15 días hábiles desde la presentación.
function fechaLimite(desde) {
  const d = new Date(desde);
  let habiles = 0;
  while (habiles < 15) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) habiles++;
  }
  return d;
}

// Días hábiles desde hoy (exclusivo) hasta "fecha"; negativo si ya pasó.
function habilesHasta(fecha) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fin = new Date(fecha); fin.setHours(0, 0, 0, 0);
  const dir = fin >= hoy ? 1 : -1;
  let n = 0;
  const d = new Date(hoy);
  while (dir > 0 ? d < fin : d > fin) {
    d.setDate(d.getDate() + dir);
    if (d.getDay() !== 0 && d.getDay() !== 6) n += dir;
  }
  return n;
}

function plazoBadge(r) {
  if (r.estado === 'respondido') return '<span class="badge bg-secondary">Cerrado</span>';
  const limite = fechaLimite(r.created_at);
  const restan = habilesHasta(limite);
  const fecha = limite.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
  if (restan < 0) return `<span class="badge bg-danger">VENCIDO (${fecha})</span>`;
  if (restan <= 3) return `<span class="badge bg-danger">${restan} d. háb. (${fecha})</span>`;
  if (restan <= 7) return `<span class="badge bg-warning text-dark">${restan} d. háb. (${fecha})</span>`;
  return `<span class="badge bg-success">${restan} d. háb. (${fecha})</span>`;
}

async function loadReclamos() {
  let query = supabase.from('reclamos').select('*').order('created_at', { ascending: false });
  if (estadoFilter.value) query = query.eq('estado', estadoFilter.value);

  const { data, error } = await query;
  if (error) {
    console.error(error);
    tableBody.innerHTML = '<tr><td colspan="7" class="text-danger">No se pudieron cargar los reclamos.</td></tr>';
    return;
  }
  porId = new Map((data || []).map((r) => [r.id, r]));
  renderTable(data || []);
  updateBadge();
}

async function updateBadge() {
  const { count } = await supabase.from('reclamos').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente');
  if (!badge) return;
  badge.textContent = count || 0;
  badge.classList.toggle('d-none', !count);
}

function renderTable(rows) {
  tableBody.innerHTML = rows.map((r) => {
    const wa = waLink(r.telefono);
    const options = Object.entries(ESTADOS)
      .map(([v, l]) => `<option value="${v}"${v === r.estado ? ' selected' : ''}>${l}</option>`).join('');
    const clips = Array.isArray(r.adjuntos) && r.adjuntos.length
      ? ` <i class="bi bi-paperclip" title="${r.adjuntos.length} adjunto(s)"></i>` : '';
    return `
      <tr>
        <td class="small fw-bold">${codigoDe(r)}</td>
        <td class="small text-muted">${new Date(r.created_at).toLocaleString('es-PE')}</td>
        <td class="small">
          <strong>${escapeHtml(r.nombre)}</strong>${clips}<br>
          <span class="text-muted">${escapeHtml(r.telefono)}${r.email ? ' · ' + escapeHtml(r.email) : ''}</span>
        </td>
        <td class="small">${escapeHtml(r.tipo)}</td>
        <td>${plazoBadge(r)}</td>
        <td><select class="form-select form-select-sm reclamo-estado" data-id="${r.id}" style="width:auto;">${options}</select></td>
        <td class="text-nowrap">
          <button type="button" class="btn btn-sm btn-outline-primary reclamo-ver" data-id="${r.id}" title="Ver detalle"><i class="bi bi-eye"></i></button>
          ${wa ? `<a href="${wa}" target="_blank" class="btn btn-sm btn-outline-success" title="WhatsApp"><i class="bi bi-whatsapp"></i></a>` : ''}
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="7" class="text-center text-muted py-4">No hay reclamos registrados 🎉</td></tr>';

  document.querySelectorAll('.reclamo-estado').forEach((sel) => {
    sel.addEventListener('change', async () => {
      sel.disabled = true;
      const cambios = {
        estado: sel.value,
        respondido_at: sel.value === 'respondido' ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from('reclamos').update(cambios).eq('id', sel.dataset.id);
      if (error) { console.error(error); alert('No se pudo actualizar el estado.'); }
      sel.disabled = false;
      loadReclamos();
    });
  });

  document.querySelectorAll('.reclamo-ver').forEach((btn) => {
    btn.addEventListener('click', () => abrirDetalle(btn.dataset.id));
  });
}

function abrirDetalle(id) {
  const r = porId.get(id);
  if (!r) return;
  document.getElementById('reclamoDetalleTitulo').textContent = `Reclamo ${codigoDe(r)}`;
  const fila = (k, v) => (v ? `<dt class="col-sm-4">${k}</dt><dd class="col-sm-8">${escapeHtml(v)}</dd>` : '');
  const adjuntos = (Array.isArray(r.adjuntos) ? r.adjuntos : []).map((a, i) => `
    <button type="button" class="btn btn-sm btn-outline-secondary me-2 mb-2 reclamo-adjunto" data-path="${escapeHtml(a.path)}">
      <i class="bi bi-paperclip"></i> ${escapeHtml(a.nombre || 'adjunto ' + (i + 1))}
    </button>`).join('');
  document.getElementById('reclamoDetalleBody').innerHTML = `
    <dl class="row small mb-2">
      ${fila('Presentado', new Date(r.created_at).toLocaleString('es-PE'))}
      ${fila('Responder antes de', fechaLimite(r.created_at).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}
      ${fila('Tipo', r.tipo)}
      ${fila('Nombre', r.nombre)}
      ${fila('Documento', r.dni)}
      ${fila('Teléfono', r.telefono)}
      ${fila('Correo', r.email)}
      ${fila('Prefiere respuesta por', r.respuesta_preferida)}
      ${fila('Sucursal', r.sucursal)}
      ${fila('Respondido el', r.respondido_at ? new Date(r.respondido_at).toLocaleString('es-PE') : '')}
    </dl>
    <h6>Detalle del reclamo</h6>
    <p class="border-start border-3 ps-3" style="white-space:pre-wrap;">${escapeHtml(r.detalle)}</p>
    ${adjuntos ? '<h6>Adjuntos</h6>' + adjuntos : ''}
  `;
  document.querySelectorAll('.reclamo-adjunto').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const { data, error } = await supabase.storage.from('reclamos').createSignedUrl(btn.dataset.path, 300);
      btn.disabled = false;
      if (error || !data?.signedUrl) { console.error(error); alert('No se pudo abrir el adjunto.'); return; }
      window.open(data.signedUrl, '_blank', 'noopener');
    });
  });
  bootstrap.Modal.getOrCreateInstance(document.getElementById('reclamoDetalleModal')).show();
}

estadoFilter.addEventListener('change', loadReclamos);
document.addEventListener('admin:show-reclamos', loadReclamos);

await requireAdmin();
// Contador de pendientes visible apenas carga el panel, sin abrir la pestaña.
updateBadge();
