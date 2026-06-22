// Buscador de las páginas de país (/destinos/...). Reutiliza el deep-link del
// motor e-agencias: el destino (ciudad principal del país) va en data-dest.
(function () {
  const form = document.getElementById('destinoSearchForm');
  if (!form) return;

  const ymd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };

  const checkin = document.getElementById('destCheckin');
  const checkout = document.getElementById('destCheckout');
  const today = ymd(new Date());
  if (checkin) checkin.min = today;
  if (checkout) checkout.min = today;
  if (checkin && checkout) {
    checkin.addEventListener('change', () => {
      if (!checkin.value) return;
      const p = checkin.value.split('-').map(Number);
      checkout.min = ymd(new Date(p[0], p[1] - 1, p[2] + 1));
      if (checkout.value && checkout.value <= checkin.value) checkout.value = '';
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const engine = 'https://viajeslmreps.e-agencias.com';
    const o = document.getElementById('destOrigen').value;
    const d = form.dataset.dest;
    let ci = checkin.value;
    let co = checkout.value;
    const pax = Math.max(1, parseInt(document.getElementById('destPax').value, 10) || 1);

    if (!ci || ci < today) { const t = new Date(); t.setDate(t.getDate() + 14); ci = ymd(t); }
    if (!co || co <= ci) { const p = ci.split('-').map(Number); co = ymd(new Date(p[0], p[1] - 1, p[2] + 7)); }

    let url;
    if (o && d && o !== d) {
      url = `${engine}/trip/start/FH/${o}/${d}/${ci}/${co}/${d}/${ci}/${co}/${pax}-0?from=PSB&nw=true&reSearch=true`;
    } else {
      url = `${engine}/paquetes`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  });
})();
