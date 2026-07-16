// Menú "Destinos" del navbar: el markup trae los 10 países con página de
// destino; aquí se ocultan los que hoy no tienen paquetes etiquetados en el
// manifiesto (campo País del panel admin). Sin red o sin JS quedan los 10.
(function () {
  const menu = document.getElementById('navDestinosMenu');
  if (!menu) return;
  fetch('/Assets/data/paquetes.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => {
      const conPaquetes = new Set();
      (list || []).forEach((p) => (p.countries || []).forEach((c) => conPaquetes.add(c)));
      if (!conPaquetes.size) return;
      let visibles = 0;
      menu.querySelectorAll('[data-country]').forEach((li) => {
        if (conPaquetes.has(li.dataset.country)) visibles += 1;
        else li.classList.add('d-none');
      });
      if (!visibles) {
        const item = document.getElementById('navDestinos');
        if (item) item.classList.add('d-none');
      }
    })
    .catch(() => {});
})();
