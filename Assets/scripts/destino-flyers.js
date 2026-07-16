import { supabase } from './supabase-client.js';

// Afiches del país en las páginas /destinos/{pais}: todas las promociones
// activas con `pais` asignado, deduplicadas por archivo. Cada afiche enlaza a
// su página de paquete si existe (slug propio o match por imagen en el
// manifiesto), si no a su link propio, y como último recurso a WhatsApp.
// Los paquetes hechos a mano (PDF) van aparte, en "Itinerarios a {país}"
// (destino-paquetes.js). La sección queda oculta (d-none) hasta tener datos.
(async function () {
  const grid = document.getElementById('flyersPais');
  if (!grid) return;
  const country = grid.dataset.country;
  if (!country) return;

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : t;
    return d.innerHTML;
  }

  const [{ data, error }, manifest] = await Promise.all([
    supabase
      .from('promotions')
      .select('image_url, title, description, link_url, button_text, slug')
      .eq('is_active', true)
      .eq('pais', country)
      .order('display_order'),
    fetch('/Assets/data/paquetes.json').then((r) => (r.ok ? r.json() : [])).catch(() => []),
  ]);
  if (error || !data || !data.length) return;

  // URL de afiche -> slug de paquete (cualquier variante del mismo archivo).
  const slugBySrc = {};
  (manifest || []).forEach((p) => {
    const urls = p.images && p.images.length ? p.images : [p.image];
    urls.forEach((u) => { if (u) slugBySrc[u] = p.slug; });
  });

  // Un mismo afiche puede estar en varias filas (una por categoría):
  // deduplicar por archivo conservando el slug si alguna fila lo tiene.
  const byFile = new Map();
  data.forEach((r) => {
    const f = (r.image_url || '').split('/').pop().toLowerCase();
    if (!f) return;
    if (!byFile.has(f)) byFile.set(f, { ...r });
    const e = byFile.get(f);
    if (r.slug && !e.slug) e.slug = r.slug;
  });
  const items = [...byFile.values()];
  if (!items.length) return;

  grid.innerHTML = items.map((item) => {
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
            <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}" loading="lazy" class="flyer-card-img flyer-zoomable" role="button">
            <span class="flyer-card-zoom"><i class="bi bi-arrows-fullscreen"></i></span>
            <h3 class="flyer-card-title">${escapeHtml(item.title)}</h3>
          </div>
          <div class="flyer-card-body">
            <p class="flyer-card-desc">${escapeHtml(item.description || '')}</p>
            ${linkHtml}
          </div>
        </div>
      </div>`;
  }).join('');

  // Modal de zoom (mismo patrón del home), creado al vuelo para no duplicar
  // markup en las 10 páginas de destino.
  let modalEl = document.getElementById('flyersPreviewModal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'flyersPreviewModal';
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content" style="background: rgba(0,0,0,0.9); border: none;">
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position: absolute; right: 15px; top: 15px; z-index: 10;"></button>
          <div class="modal-body p-0 text-center">
            <img src="" class="img-fluid img-preview-custom" alt="Vista previa">
          </div>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
    modalEl.addEventListener('hidden.bs.modal', () => { modalEl.querySelector('img').src = ''; });
  }
  grid.addEventListener('click', (e) => {
    const img = e.target.closest('.flyer-zoomable');
    if (!img) return;
    modalEl.querySelector('img').src = img.src;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
  });

  const section = document.getElementById('flyersPaisSection');
  if (section) section.classList.remove('d-none');
})();
