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

await requireAdmin();
