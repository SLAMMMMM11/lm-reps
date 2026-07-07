import { supabase } from './supabase-client.js';
import { requireAdmin } from './auth-guard.js';

const tableBody = document.getElementById('promocionesTableBody');
const categoryFilter = document.getElementById('promoCategoryFilter');
const promocionModal = new bootstrap.Modal(document.getElementById('promocionModal'));
const alertBox = document.getElementById('promocionAlert');
const preview = document.getElementById('promoImagenPreview');

const CATEGORY_LABEL = {
  carouselpromos: 'Promociones',
  carouselnorteamerica: 'Norteamérica',
  carouselcentroamerica: 'Caribe',
  carouselsudamerica: 'Sudamérica',
  carouselasia: 'Asia',
  carouseleuropa: 'Europa',
};

const PAIS_OPTIONS = [
  ['peru', 'Perú'], ['mexico', 'México'], ['espana', 'España'], ['estados-unidos', 'Estados Unidos'],
  ['argentina', 'Argentina'], ['emiratos-arabes', 'Emiratos Árabes'], ['china', 'China'], ['japon', 'Japón'],
  ['tailandia', 'Tailandia'], ['italia', 'Italia'],
];

// slug que se mantiene al editar (los flyers "principales" tienen slug = página).
let currentSlug = '';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function setPreview(url) {
  if (preview) preview.src = url || '';
}

function showAlert(message, type = 'danger') {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
}

async function loadPromotions() {
  let query = supabase.from('promotions').select('*').order('category').order('display_order');
  if (categoryFilter.value) query = query.eq('category', categoryFilter.value);

  const { data, error } = await query;
  if (error) { console.error(error); tableBody.innerHTML = '<tr><td colspan="6" class="text-danger">Error al cargar.</td></tr>'; return; }
  renderTable(data);
}

function renderTable(rows) {
  tableBody.innerHTML = rows.map((p) => `
    <tr>
      <td><img src="${p.image_url}" style="max-height:40px;max-width:60px;object-fit:cover;" class="rounded"></td>
      <td class="small">${CATEGORY_LABEL[p.category] || p.category}${p.slug ? ' <i class="bi bi-link-45deg text-success" title="Tiene página de paquete"></i>' : ''}</td>
      <td class="small">${escapeHtml(p.title)}</td>
      <td class="small">${p.display_order}</td>
      <td>${p.is_active ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-secondary">No</span>'}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary edit-promo-btn" data-id="${p.id}">Editar</button>
        <button class="btn btn-sm btn-outline-danger delete-promo-btn" data-id="${p.id}">Eliminar</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="text-center text-muted py-4">Sin paquetes registrados</td></tr>';

  document.querySelectorAll('.edit-promo-btn').forEach((btn) => {
    btn.addEventListener('click', () => openEditModal(rows.find((p) => p.id === btn.dataset.id)));
  });
  document.querySelectorAll('.delete-promo-btn').forEach((btn) => {
    btn.addEventListener('click', () => deletePromotion(btn.dataset.id));
  });
}

function resetForm() {
  currentSlug = '';
  document.getElementById('promocionId').value = '';
  document.getElementById('promoCategoriaInput').value = 'carouselpromos';
  document.getElementById('promoTituloInput').value = '';
  document.getElementById('promoDescripcionInput').value = '';
  document.getElementById('promoHighlightsInput').value = '';
  document.getElementById('promoImagenInput').value = '';
  document.getElementById('promoImagenUpload').value = '';
  document.getElementById('promoDestinoInput').value = '';
  document.getElementById('promoPaisInput').value = '';
  document.getElementById('promoDurationInput').value = '';
  document.getElementById('promoOrdenInput').value = '0';
  document.getElementById('promoActivaInput').checked = true;
  setPreview('');
  toggleAutocompletarIaBtn();
  alertBox.className = 'alert d-none';
  document.getElementById('promocionModalTitle').textContent = 'Nuevo paquete';
}

function openEditModal(promo) {
  if (!promo) return;
  currentSlug = promo.slug || '';
  document.getElementById('promocionId').value = promo.id;
  document.getElementById('promoCategoriaInput').value = promo.category;
  document.getElementById('promoTituloInput').value = promo.title || '';
  document.getElementById('promoDescripcionInput').value = promo.subtitle || promo.description || '';
  document.getElementById('promoHighlightsInput').value = (promo.highlights || []).join('\n');
  document.getElementById('promoImagenInput').value = promo.image_url || '';
  document.getElementById('promoDestinoInput').value = promo.destino || '';
  document.getElementById('promoPaisInput').value = promo.pais || '';
  document.getElementById('promoDurationInput').value = promo.duration || '';
  document.getElementById('promoOrdenInput').value = promo.display_order;
  document.getElementById('promoActivaInput').checked = promo.is_active;
  setPreview(promo.image_url);
  toggleAutocompletarIaBtn();
  alertBox.className = 'alert d-none';
  document.getElementById('promocionModalTitle').textContent = 'Editar paquete';
  promocionModal.show();
}

async function deletePromotion(id) {
  if (!confirm('¿Eliminar este paquete?')) return;
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) { console.error(error); alert('No se pudo eliminar.'); return; }
  loadPromotions();
}

document.getElementById('nuevaPromoBtn').addEventListener('click', resetForm);

// Vista previa al pegar/escribir una URL de imagen.
document.getElementById('promoImagenInput').addEventListener('input', (e) => setPreview(e.target.value.trim()));

const autocompletarIaBtn = document.getElementById('autocompletarIaBtn');

function toggleAutocompletarIaBtn() {
  autocompletarIaBtn.disabled = !document.getElementById('promoImagenInput').value.trim();
}

document.getElementById('promoImagenUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const path = `${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('promo-images').upload(path, file);
  if (uploadError) { showAlert('No se pudo subir la imagen.'); console.error(uploadError); return; }

  const { data } = supabase.storage.from('promo-images').getPublicUrl(path);
  document.getElementById('promoImagenInput').value = data.publicUrl;
  setPreview(data.publicUrl);
  toggleAutocompletarIaBtn();
});

document.getElementById('promoImagenInput').addEventListener('input', toggleAutocompletarIaBtn);

// "Autocompletar con IA": sugiere título/categoría/destino/duración/descripción
// a partir del afiche subido. Solo rellena los campos -- nada se guarda en
// `promotions` hasta que se haga clic en "Guardar paquete".
autocompletarIaBtn.addEventListener('click', async () => {
  const imageUrl = document.getElementById('promoImagenInput').value.trim();
  if (!imageUrl) return;

  const orig = autocompletarIaBtn.innerHTML;
  autocompletarIaBtn.disabled = true;
  autocompletarIaBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Analizando...';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/extract-flyer-metadata', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + (session?.access_token || ''), 'content-type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });
    const sugerido = await res.json();
    if (!res.ok) {
      const detail = sugerido?.detail ? `: ${sugerido.detail}` : '';
      throw new Error((sugerido?.error || ('http ' + res.status)) + detail);
    }

    if (sugerido.title) document.getElementById('promoTituloInput').value = sugerido.title;
    if (sugerido.category) document.getElementById('promoCategoriaInput').value = sugerido.category;
    if (sugerido.description) document.getElementById('promoDescripcionInput').value = sugerido.description;
    if (Array.isArray(sugerido.highlights)) document.getElementById('promoHighlightsInput').value = sugerido.highlights.join('\n');
    if (sugerido.destino) document.getElementById('promoDestinoInput').value = sugerido.destino;
    if (sugerido.pais) document.getElementById('promoPaisInput').value = sugerido.pais;
    if (sugerido.duration) document.getElementById('promoDurationInput').value = sugerido.duration;

    showAlert('Campos sugeridos por IA, revísalos antes de guardar.', 'info');
  } catch (e) {
    console.error('autocompletar-ia', e);
    showAlert(`No se pudo autocompletar (${e.message}). Completa los campos manualmente.`);
  } finally {
    autocompletarIaBtn.disabled = false;
    autocompletarIaBtn.innerHTML = orig;
  }
});

document.getElementById('guardarPromoBtn').addEventListener('click', async () => {
  const id = document.getElementById('promocionId').value;
  const title = document.getElementById('promoTituloInput').value.trim();
  const descripcion = document.getElementById('promoDescripcionInput').value.trim();
  const highlights = document.getElementById('promoHighlightsInput').value
    .split('\n').map((s) => s.trim()).filter(Boolean);
  const pais = document.getElementById('promoPaisInput').value || null;
  const destino = document.getElementById('promoDestinoInput').value.trim() || null;
  const duration = document.getElementById('promoDurationInput').value.trim() || null;

  // El slug se mantiene al editar; al crear se genera desde el título.
  const slug = id ? (currentSlug || null) : (slugify(title) || null);

  const payload = {
    category: document.getElementById('promoCategoriaInput').value,
    title,
    subtitle: descripcion || null,
    description: descripcion || null,
    image_url: document.getElementById('promoImagenInput').value.trim(),
    highlights,
    destino,
    pais,
    duration,
    slug,
    display_order: Number(document.getElementById('promoOrdenInput').value) || 0,
    is_active: document.getElementById('promoActivaInput').checked,
  };

  if (!payload.title || !payload.image_url) {
    showAlert('Completa al menos el título y la imagen.');
    return;
  }

  const query = id
    ? supabase.from('promotions').update(payload).eq('id', id)
    : supabase.from('promotions').insert(payload);

  const { error } = await query;
  if (error) { showAlert('No se pudo guardar el paquete.'); console.error(error); return; }

  promocionModal.hide();
  loadPromotions();
});

categoryFilter.addEventListener('change', loadPromotions);

document.addEventListener('admin:show-promociones', loadPromotions);

// "Publicar cambios": dispara el rebuild de Netlify (vía la función /api/publish,
// que valida admin y llama al Build Hook). El sitio se actualiza en ~1-2 min.
const publicarBtn = document.getElementById('publicarBtn');
if (publicarBtn) {
  publicarBtn.addEventListener('click', async () => {
    const status = document.getElementById('publicarStatus');
    const orig = publicarBtn.innerHTML;
    publicarBtn.disabled = true;
    publicarBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Publicando...';
    const setStatus = (cls, html) => { status.className = `alert ${cls} small py-2`; status.innerHTML = html; };
    setStatus('alert-info', 'Publicando cambios… el sitio se actualizará en ~1-2 minutos.');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/publish', { method: 'POST', headers: { Authorization: 'Bearer ' + (session?.access_token || '') } });
      if (!res.ok) throw new Error('http ' + res.status);
      setStatus('alert-success', '✓ Publicación iniciada. Tus cambios estarán en línea en ~1-2 minutos.');
    } catch (e) {
      console.error('publicar', e);
      setStatus('alert-danger', 'No se pudo publicar. Verifica la configuración del Build Hook (BUILD_HOOK_URL) o intenta de nuevo.');
    } finally {
      publicarBtn.disabled = false;
      publicarBtn.innerHTML = orig;
    }
  });
}

// ---- Carga masiva de flyers ----
// Permite seleccionar varios afiches a la vez: cada uno se sube y se pasa
// por el mismo autocompletado con IA que el flujo individual, pero en
// paralelo. Nada se guarda en `promotions` hasta que se revisan los datos
// (o se corrigen a mano si la IA falló) y se hace clic en "Guardar todos".
const bulkModalEl = document.getElementById('promocionBulkModal');
const bulkFileInput = document.getElementById('bulkImagenUpload');
const bulkRowsEl = document.getElementById('bulkRows');
const bulkSummaryEl = document.getElementById('bulkSummary');
const bulkAlertEl = document.getElementById('bulkAlert');
const guardarBulkBtn = document.getElementById('guardarBulkBtn');

let bulkItems = [];
let bulkSeq = 0;

function showBulkAlert(message, type = 'danger') {
  bulkAlertEl.textContent = message;
  bulkAlertEl.className = `alert alert-${type}`;
}

function bulkStatusBadge(item) {
  if (item.status === 'uploading') return '<span class="badge bg-secondary">Subiendo...</span>';
  if (item.status === 'processing') return '<span class="badge bg-info text-dark">Analizando con IA...</span>';
  if (item.status === 'error') return `<span class="badge bg-danger" title="${escapeHtml(item.error || '')}">Revisar a mano</span>`;
  return '<span class="badge bg-success">Listo</span>';
}

function updateBulkSummary() {
  const total = bulkItems.length;
  const done = bulkItems.filter((it) => it.status === 'ready' || it.status === 'error').length;
  bulkSummaryEl.textContent = total ? `${done}/${total} procesados` : '';
  guardarBulkBtn.disabled = total === 0 || bulkItems.some((it) => it.status === 'uploading' || it.status === 'processing');
}

function renderBulkRows() {
  bulkRowsEl.innerHTML = bulkItems.map((item) => `
    <div class="border rounded-3 p-2 d-flex gap-3 align-items-start">
      <img src="${item.imageUrl || item.previewUrl || ''}" class="rounded border flex-shrink-0" style="width:70px;height:95px;object-fit:cover;background:#f1f3f5;">
      <div class="flex-grow-1">
        <div class="d-flex justify-content-between align-items-center mb-1">
          ${bulkStatusBadge(item)}
          <button type="button" class="btn btn-sm btn-outline-danger bulk-remove-btn" data-row-id="${item.id}"><i class="bi bi-trash"></i></button>
        </div>
        <div class="row g-2">
          <div class="col-md-4">
            <input type="text" class="form-control form-control-sm bulk-title" data-row-id="${item.id}" placeholder="Título *" value="${escapeHtml(item.title || '')}">
          </div>
          <div class="col-md-4">
            <select class="form-select form-select-sm bulk-category" data-row-id="${item.id}">
              ${Object.entries(CATEGORY_LABEL).map(([v, l]) => `<option value="${v}" ${item.category === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-4">
            <input type="text" class="form-control form-control-sm bulk-destino" data-row-id="${item.id}" placeholder="Destino" value="${escapeHtml(item.destino || '')}">
          </div>
          <div class="col-md-4">
            <select class="form-select form-select-sm bulk-pais" data-row-id="${item.id}">
              <option value="">Página de país: ninguna</option>
              ${PAIS_OPTIONS.map(([v, l]) => `<option value="${v}" ${item.pais === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="col-md-4">
            <input type="text" class="form-control form-control-sm bulk-duration" data-row-id="${item.id}" placeholder="Duración" value="${escapeHtml(item.duration || '')}">
          </div>
          <div class="col-md-2">
            <input type="number" class="form-control form-control-sm bulk-order" data-row-id="${item.id}" placeholder="Orden" value="${item.order ?? 0}">
          </div>
          <div class="col-md-2 d-flex align-items-center">
            <div class="form-check">
              <input class="form-check-input bulk-active" type="checkbox" data-row-id="${item.id}" ${item.active ? 'checked' : ''}>
              <label class="form-check-label small">Activo</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('') || '<p class="text-muted small text-center py-4">Selecciona uno o más afiches arriba para empezar.</p>';

  updateBulkSummary();
}

function resetBulkModal() {
  bulkItems.forEach((it) => { if (it.previewUrl) URL.revokeObjectURL(it.previewUrl); });
  bulkItems = [];
  bulkFileInput.value = '';
  bulkAlertEl.className = 'alert d-none';
  renderBulkRows();
}

async function processBulkItem(item) {
  try {
    const path = `${Date.now()}-${item.file.name}`;
    const { error: uploadError } = await supabase.storage.from('promo-images').upload(path, item.file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('promo-images').getPublicUrl(path);
    item.imageUrl = data.publicUrl;
    item.status = 'processing';
    renderBulkRows();

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/extract-flyer-metadata', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + (session?.access_token || ''), 'content-type': 'application/json' },
      body: JSON.stringify({ imageUrl: item.imageUrl }),
    });
    const sugerido = await res.json();
    if (!res.ok) throw new Error(sugerido?.error || ('http ' + res.status));

    item.title = sugerido.title || '';
    item.category = sugerido.category || item.category;
    item.destino = sugerido.destino || '';
    item.pais = sugerido.pais || '';
    item.duration = sugerido.duration || '';
    item.description = sugerido.description || '';
    item.highlights = Array.isArray(sugerido.highlights) ? sugerido.highlights : [];
    item.status = 'ready';
  } catch (e) {
    console.error('bulk-process', item.file?.name, e);
    item.status = 'error';
    item.error = e.message || 'No se pudo procesar';
  } finally {
    renderBulkRows();
  }
}

bulkModalEl?.addEventListener('show.bs.modal', () => { if (!bulkItems.length) resetBulkModal(); });

bulkFileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const newItems = files.map((file) => ({
    id: `b${Date.now()}_${bulkSeq++}`,
    file,
    previewUrl: URL.createObjectURL(file),
    imageUrl: '',
    status: 'uploading',
    error: '',
    title: '',
    category: 'carouselpromos',
    destino: '',
    pais: '',
    duration: '',
    order: 0,
    active: true,
  }));
  bulkItems = bulkItems.concat(newItems);
  bulkFileInput.value = '';
  renderBulkRows();
  await Promise.all(newItems.map(processBulkItem));
});

// Delegación: los inputs de cada fila se re-crean al renderizar, así que
// escuchamos en el contenedor. `input` solo actualiza el estado (sin volver
// a renderizar) para no perder el foco mientras se escribe.
bulkRowsEl.addEventListener('input', (e) => {
  const id = e.target.dataset.rowId;
  const item = bulkItems.find((it) => it.id === id);
  if (!item) return;
  if (e.target.classList.contains('bulk-title')) item.title = e.target.value;
  else if (e.target.classList.contains('bulk-destino')) item.destino = e.target.value;
  else if (e.target.classList.contains('bulk-duration')) item.duration = e.target.value;
  else if (e.target.classList.contains('bulk-order')) item.order = Number(e.target.value) || 0;
});

bulkRowsEl.addEventListener('change', (e) => {
  const id = e.target.dataset.rowId;
  const item = bulkItems.find((it) => it.id === id);
  if (!item) return;
  if (e.target.classList.contains('bulk-category')) item.category = e.target.value;
  else if (e.target.classList.contains('bulk-pais')) item.pais = e.target.value || null;
  else if (e.target.classList.contains('bulk-active')) item.active = e.target.checked;
});

bulkRowsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.bulk-remove-btn');
  if (!btn) return;
  const id = btn.dataset.rowId;
  const item = bulkItems.find((it) => it.id === id);
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
  bulkItems = bulkItems.filter((it) => it.id !== id);
  renderBulkRows();
});

guardarBulkBtn.addEventListener('click', async () => {
  if (!bulkItems.length) return;
  const missingTitle = bulkItems.find((it) => !it.title?.trim());
  if (missingTitle) { showBulkAlert('Todos los paquetes necesitan un título antes de guardar.'); return; }
  const missingImage = bulkItems.find((it) => !it.imageUrl);
  if (missingImage) { showBulkAlert('Espera a que todas las imágenes terminen de subirse.'); return; }

  const orig = guardarBulkBtn.innerHTML;
  guardarBulkBtn.disabled = true;
  guardarBulkBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Guardando...';

  const payload = bulkItems.map((it) => ({
    category: it.category,
    title: it.title.trim(),
    subtitle: it.description || null,
    description: it.description || null,
    image_url: it.imageUrl,
    highlights: it.highlights || [],
    destino: it.destino?.trim() || null,
    pais: it.pais || null,
    duration: it.duration?.trim() || null,
    slug: slugify(it.title) || null,
    display_order: Number(it.order) || 0,
    is_active: !!it.active,
  }));

  const { error } = await supabase.from('promotions').insert(payload);
  if (error) {
    console.error(error);
    showBulkAlert('No se pudieron guardar. Revisa la consola e intenta de nuevo.');
    guardarBulkBtn.disabled = false;
    guardarBulkBtn.innerHTML = orig;
    return;
  }

  resetBulkModal();
  guardarBulkBtn.innerHTML = orig;
  bootstrap.Modal.getInstance(bulkModalEl)?.hide();
  loadPromotions();
});

await requireAdmin();
