import { supabase } from './supabase-client.js';
import { requireAdmin } from './auth-guard.js';

const tableBody = document.getElementById('leadsTableBody');
const statusFilter = document.getElementById('leadsStatusFilter');
const badge = document.getElementById('leadsBadge');

const STATUSES = ['nuevo', 'contactado', 'cotizado', 'cerrado'];

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// Arma un link wa.me a partir del teléfono que dejó el cliente.
function waLink(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 9) d = '51' + d; // celular peruano sin prefijo
  return d ? 'https://wa.me/' + d : null;
}

async function loadLeads() {
  let query = supabase.from('leads').select('*').order('created_at', { ascending: false });
  if (statusFilter.value) query = query.eq('status', statusFilter.value);

  const { data, error } = await query;
  if (error) {
    console.error(error);
    tableBody.innerHTML = '<tr><td colspan="6" class="text-danger">No se pudieron cargar las solicitudes.</td></tr>';
    return;
  }
  renderTable(data || []);
  updateBadge();
}

async function updateBadge() {
  const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'nuevo');
  if (!badge) return;
  badge.textContent = count || 0;
  badge.classList.toggle('d-none', !count);
}

function renderTable(rows) {
  tableBody.innerHTML = rows.map((l) => {
    const interes = [l.paquete, l.destino, l.tipo_viaje].filter(Boolean).join(' · ') || '—';
    const detalle = [
      l.personas ? l.personas + ' pax' : '',
      l.fecha_tentativa ? 'Fecha: ' + l.fecha_tentativa : '',
      l.mensaje ? 'Nota: ' + l.mensaje : '',
    ].filter(Boolean).join(' | ');
    const wa = waLink(l.telefono);
    const options = STATUSES.map((s) => `<option value="${s}"${s === l.status ? ' selected' : ''}>${s}</option>`).join('');
    return `
      <tr>
        <td class="small text-muted">${new Date(l.created_at).toLocaleString('es-PE')}</td>
        <td class="small">
          <strong>${escapeHtml(l.nombre)}</strong><br>
          <span class="text-muted">${escapeHtml(l.telefono)}${l.email ? ' · ' + escapeHtml(l.email) : ''}</span>
        </td>
        <td class="small" title="${escapeHtml(detalle)}">${escapeHtml(interes)}${detalle ? ' <i class="bi bi-info-circle text-muted"></i>' : ''}</td>
        <td>${l.financiamiento ? '<span class="badge bg-warning text-dark">Sí</span>' : '<span class="text-muted">—</span>'}</td>
        <td><select class="form-select form-select-sm lead-status" data-id="${l.id}" style="width:auto;">${options}</select></td>
        <td>${wa ? `<a href="${wa}" target="_blank" class="btn btn-sm btn-outline-success"><i class="bi bi-whatsapp"></i></a>` : ''}</td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="text-center text-muted py-4">Aún no hay solicitudes</td></tr>';

  document.querySelectorAll('.lead-status').forEach((sel) => {
    sel.addEventListener('change', async () => {
      sel.disabled = true;
      const { error } = await supabase.from('leads').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) { console.error(error); alert('No se pudo actualizar el estado.'); }
      sel.disabled = false;
      updateBadge();
    });
  });
}

statusFilter.addEventListener('change', loadLeads);
document.addEventListener('admin:show-solicitudes', loadLeads);

await requireAdmin();
// Muestra el contador de "nuevos" apenas carga el panel (sin abrir la pestaña).
updateBadge();
