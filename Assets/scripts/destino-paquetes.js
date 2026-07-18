// Grilla "Itinerarios a {país}" en las páginas de país (/destinos/...).
// Muestra SOLO los paquetes con página hecha a mano (custom, ej. Colores de
// España, creados desde los PDF del mayorista) — los afiches/flyers van en su
// propia sección al final de la página (destino-flyers.js). La sección
// (id="itinerarios") y su pill del subnav empiezan ocultas (d-none) en el
// HTML; este script las revela solo si el país tiene algún paquete custom.
(function () {
  const grid = document.getElementById('paquetesPais');
  if (!grid) return;
  const country = grid.dataset.country;
  if (!country) return;
  const section = document.getElementById('itinerarios');
  const subnavPill = document.getElementById('dtSubnavItinerarios');

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : t;
    return d.innerHTML;
  }

  fetch('/Assets/data/paquetes.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      const items = (list || []).filter(
        (p) => p.custom && Array.isArray(p.countries) && p.countries.includes(country)
      );
      if (!items.length) return;
      grid.innerHTML = items
        .map(
          (p) => `
        <div class="col-6 col-md-4 col-lg-3">
          <a href="/paquete/${p.slug}" class="flyer-card text-decoration-none d-block">
            <div class="flyer-card-media">
              <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" loading="lazy" class="flyer-card-img">
              <h3 class="flyer-card-title">${escapeHtml(p.title)}</h3>
            </div>
            <div class="flyer-card-body">
              <span class="flyer-card-link">Ver paquete →</span>
            </div>
          </a>
        </div>`
        )
        .join('');
      if (section) section.classList.remove('d-none');
      if (subnavPill) subnavPill.classList.remove('d-none');
    })
    .catch(() => {});
})();
