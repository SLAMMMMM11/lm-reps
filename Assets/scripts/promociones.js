import { supabase } from './supabase-client.js';

// Página /promociones: todos los afiches vigentes leídos en vivo de Supabase
// (aparecen apenas Cindy los sube, sin esperar "Publicar cambios"), con chips
// por región, zoom y enlace a la página de paquete cuando existe.
(async function () {
  const grid = document.getElementById('promosGrid');
  if (!grid) return;
  const chipsBox = document.getElementById('promosChips');
  const countEl = document.getElementById('promosCount');

  const REGION_ORDER = ['carouselpromos', 'carouselnorteamerica', 'carouselcentroamerica', 'carouselsudamerica', 'carouselasia', 'carouseleuropa'];
  const REGION_LABEL = {
    carouselpromos: 'Especiales',
    carouselnorteamerica: 'Norteamérica',
    carouselcentroamerica: 'Caribe',
    carouselsudamerica: 'Sudamérica',
    carouselasia: 'Asia',
    carouseleuropa: 'Europa',
  };

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : t;
    return d.innerHTML;
  }

  const [{ data, error }, manifest] = await Promise.all([
    supabase
      .from('promotions')
      .select('category, image_url, title, description, button_text, link_url, slug')
      .eq('is_active', true)
      .order('display_order'),
    fetch('/Assets/data/paquetes.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
  ]);
  if (error || !data) {
    if (countEl) countEl.textContent = 'No se pudieron cargar las promociones. Intenta de nuevo en un momento.';
    return;
  }

  // URL de afiche -> slug de paquete (cualquier variante del mismo archivo).
  const slugBySrc = {};
  (manifest || []).forEach((p) => {
    const urls = p.images && p.images.length ? p.images : [p.image];
    urls.forEach((u) => { if (u) slugBySrc[u] = p.slug; });
  });

  // Un mismo afiche puede estar en varias filas (una por categoría):
  // deduplicar por archivo juntando todas sus regiones.
  const byFile = new Map();
  data.forEach((r) => {
    const f = (r.image_url || '').split('/').pop().toLowerCase();
    if (!f) return;
    if (!byFile.has(f)) byFile.set(f, { ...r, categories: new Set() });
    const e = byFile.get(f);
    e.categories.add(r.category);
    if (r.slug && !e.slug) e.slug = r.slug;
  });
  const items = [...byFile.values()];

  let region = 'Todos';

  function regionsPresent() {
    const present = new Set();
    items.forEach((it) => it.categories.forEach((c) => present.add(c)));
    return REGION_ORDER.filter((k) => present.has(k));
  }

  function renderChips() {
    const chips = [['Todos', 'Todos'], ...regionsPresent().map((k) => [k, REGION_LABEL[k]])];
    chipsBox.innerHTML = chips
      .map(([key, label]) => `<button type="button" class="catalogo-chip${key === region ? ' active' : ''}" data-region="${escapeHtml(key)}">${escapeHtml(label)}</button>`)
      .join('');
    chipsBox.querySelectorAll('.catalogo-chip').forEach((b) =>
      b.addEventListener('click', () => { region = b.dataset.region; renderChips(); renderGrid(); })
    );
  }

  function renderGrid() {
    const visibles = region === 'Todos' ? items : items.filter((it) => it.categories.has(region));
    if (countEl) countEl.textContent = `${visibles.length} ${visibles.length === 1 ? 'promoción vigente' : 'promociones vigentes'}`;
    grid.innerHTML = visibles.map((item) => {
      const slug = item.slug || slugBySrc[item.image_url];
      const hasRealLink = item.link_url && item.link_url !== '#';
      const linkHtml = slug
        ? `<a href="/paquete/${escapeHtml(slug)}" class="flyer-card-link">Ver paquete →</a>`
        : hasRealLink
          ? `<a href="${escapeHtml(item.link_url)}" target="_blank" rel="noopener noreferrer" class="flyer-card-link">${escapeHtml(item.button_text || 'Ver más')} →</a>`
          : `<a href="https://wa.me/51987594032?text=${encodeURIComponent('Hola, quiero cotizar: ' + (item.title || ''))}" target="_blank" rel="noopener noreferrer" class="flyer-card-link">Cotizar por WhatsApp →</a>`;
      return `
        <div class="col-6 col-md-4 col-lg-3">
          <div class="flyer-card">
            <div class="flyer-card-media">
              <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy" class="flyer-card-img"
                   data-bs-toggle="modal" data-bs-target="#previewModal" data-full="${escapeHtml(item.image_url)}">
              <span class="flyer-card-zoom"><i class="bi bi-arrows-fullscreen"></i></span>
              <h3 class="flyer-card-title">${escapeHtml(item.title)}</h3>
            </div>
            <div class="flyer-card-body">
              <p class="flyer-card-desc">${escapeHtml(item.description || '')}</p>
              ${linkHtml}
            </div>
          </div>
        </div>`;
    }).join('') || '<p class="text-muted">No hay promociones en esta categoría por ahora.</p>';
  }

  renderChips();
  renderGrid();

  const modalImg = document.getElementById('fullResImage');
  grid.addEventListener('click', (e) => {
    const img = e.target.closest('[data-full]');
    if (img && modalImg) modalImg.src = img.dataset.full;
  });
  const modalEl = document.getElementById('previewModal');
  if (modalEl) modalEl.addEventListener('hidden.bs.modal', () => { if (modalImg) modalImg.src = ''; });
})();
