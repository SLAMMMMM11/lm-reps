// Grilla "Paquetes a {país}" en las páginas de país (/destinos/...).
// Lee el manifiesto generado (Assets/data/paquetes.json), filtra por el país
// (data-country del contenedor) y pinta tarjetas-afiche que enlazan a la página
// de cada paquete /paquete/{slug}. La sección está oculta (d-none) hasta que hay
// resultados, así no se muestra un encabezado vacío.
(function () {
  const grid = document.getElementById('paquetesPais');
  if (!grid) return;
  const country = grid.dataset.country;
  if (!country) return;
  const section = document.getElementById('paquetesPaisSection');

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t == null ? '' : t;
    return d.innerHTML;
  }

  fetch('/Assets/data/paquetes.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      const items = (list || []).filter(
        (p) => Array.isArray(p.countries) && p.countries.includes(country)
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
    })
    .catch(() => {});
})();
