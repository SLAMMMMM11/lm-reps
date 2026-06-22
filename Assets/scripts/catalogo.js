// Catálogo de paquetes (/paquetes): lee el manifiesto generado y filtra por
// continente (region) y país (destino). Acepta ?region=asia en la URL para
// entrar prefiltrado desde el mega-menú "Destinos".
(function () {
  const grid = document.getElementById('catalogoGrid');
  if (!grid) return;
  const chipsBox = document.getElementById('catalogoRegions');
  const paisSelect = document.getElementById('catalogoPais');
  const countEl = document.getElementById('catalogoCount');

  const REGION_ORDER = ['Norteamérica', 'Caribe', 'Sudamérica', 'Asia', 'Europa', 'Promociones'];
  const REGION_SLUG = {
    norteamerica: 'Norteamérica', caribe: 'Caribe', sudamerica: 'Sudamérica',
    asia: 'Asia', europa: 'Europa', promociones: 'Promociones',
  };

  let all = [];
  let region = 'Todos';
  let pais = 'Todos';

  const esc = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : t; return d.innerHTML; };

  function regionsPresent() {
    const set = new Set(all.map((p) => p.region));
    return REGION_ORDER.filter((r) => set.has(r)).concat([...set].filter((r) => !REGION_ORDER.includes(r)));
  }

  function paisesFor(reg) {
    const items = reg === 'Todos' ? all : all.filter((p) => p.region === reg);
    return [...new Set(items.map((p) => p.destino))].sort((a, b) => a.localeCompare(b, 'es'));
  }

  function renderChips() {
    const regions = ['Todos', ...regionsPresent()];
    chipsBox.innerHTML = regions
      .map((r) => `<button type="button" class="catalogo-chip${r === region ? ' active' : ''}" data-region="${esc(r)}">${esc(r)}</button>`)
      .join('');
    chipsBox.querySelectorAll('.catalogo-chip').forEach((b) =>
      b.addEventListener('click', () => { region = b.dataset.region; pais = 'Todos'; renderChips(); renderPaises(); renderGrid(); })
    );
  }

  function renderPaises() {
    const paises = paisesFor(region);
    paisSelect.innerHTML = '<option value="Todos">Todos los países</option>' +
      paises.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join('');
    paisSelect.value = pais;
  }

  function renderGrid() {
    let items = all.slice();
    if (region !== 'Todos') items = items.filter((p) => p.region === region);
    if (pais !== 'Todos') items = items.filter((p) => p.destino === pais);
    if (countEl) countEl.textContent = items.length + (items.length === 1 ? ' paquete' : ' paquetes');
    grid.innerHTML = items
      .map((p) => `
        <div class="col-6 col-md-4 col-lg-3">
          <a href="/paquete/${p.slug}" class="flyer-card text-decoration-none d-block">
            <div class="flyer-card-media">
              <img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" class="flyer-card-img">
              <h3 class="flyer-card-title">${esc(p.title)}</h3>
            </div>
            <div class="flyer-card-body">
              <span class="badge-destino"><i class="bi bi-geo-alt me-1"></i>${esc(p.destino)}</span>
              <span class="flyer-card-link">Ver paquete →</span>
            </div>
          </a>
        </div>`)
      .join('') || '<p class="text-center text-muted py-5 w-100">No hay paquetes para este filtro.</p>';
  }

  if (paisSelect) paisSelect.addEventListener('change', () => { pais = paisSelect.value; renderGrid(); });

  fetch('/Assets/data/paquetes.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      all = list || [];
      const sp = new URLSearchParams(location.search).get('region');
      if (sp && REGION_SLUG[sp.toLowerCase()]) region = REGION_SLUG[sp.toLowerCase()];
      renderChips();
      renderPaises();
      renderGrid();
    })
    .catch(() => { grid.innerHTML = '<p class="text-center text-muted py-5 w-100">No se pudo cargar el catálogo.</p>'; });
})();
