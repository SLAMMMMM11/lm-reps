import { supabase } from './supabase-client.js';

// Manifiesto de paginas de paquete (generado por tools/gen-paquetes.cjs).
// Mapea la URL del flyer -> slug, para que cada tarjeta del home enlace a su
// pagina de paquete /paquete/{slug} en vez de ir directo a WhatsApp.
let packageBySrc = {};

async function loadPackageManifest() {
  try {
    const res = await fetch('/Assets/data/paquetes.json');
    if (!res.ok) return;
    const list = await res.json();
    list.forEach((p) => {
      const urls = p.images && p.images.length ? p.images : [p.image];
      urls.forEach((u) => { if (u) packageBySrc[u] = p.slug; });
    });
  } catch (e) { /* sin manifiesto: las tarjetas caen al comportamiento anterior */ }
}

async function loadTravelData() {
  try {
    const [{ data, error }] = await Promise.all([
      supabase
        .from('promotions')
        .select('category, image_url, title, description, button_text, link_url')
        .eq('is_active', true)
        .order('display_order'),
      loadPackageManifest(),
    ]);

    if (error) throw error;

    const travelData = {
      carouselpromos: [],
      carouselnorteamerica: [],
      carouselcentroamerica: [],
      carouselsudamerica: [],
      carouselasia: [],
      carouseleuropa: []
    };

    data.forEach(row => {
      if (travelData.hasOwnProperty(row.category)) {
        travelData[row.category].push({
          src: row.image_url,
          alt: row.title,
          description: row.description,
          btnText: row.button_text,
          url: row.link_url
        });
      }
    });

    renderDestinationGrid('carouselPromos', travelData.carouselpromos);
    renderDestinationGrid('carouselNorteamerica', travelData.carouselnorteamerica);
    renderDestinationGrid('carouselCentroamerica', travelData.carouselcentroamerica);
    renderDestinationGrid('carouselSudamerica', travelData.carouselsudamerica);
    renderDestinationGrid('carouselAsia', travelData.carouselasia);
    renderDestinationGrid('carouselEuropa', travelData.carouseleuropa);

  } catch (error) {
    console.error("Error cargando promociones:", error);
  }
}

function renderDestinationGrid(gridId, items) {
  const gridElement = document.getElementById(gridId);
  if (!gridElement) return;

  const parentSection = gridElement.closest('.tab-pane');
  const tabButton = document.querySelector(`[data-bs-target="#tab-${gridId}"]`);

  if (!items || items.length === 0) {
    if (tabButton) tabButton.closest('.nav-item')?.classList.add('d-none');
    return;
  }

  gridElement.innerHTML = items.map(item => {
    const slug = packageBySrc[item.src];
    const hasRealLink = item.url && item.url !== '#';
    // Prioridad: pagina de paquete generada > link propio del flyer > WhatsApp.
    const linkHtml = slug
      ? `<a href="/paquete/${slug}" class="flyer-card-link">Ver paquete →</a>`
      : hasRealLink
        ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer" class="flyer-card-link">${item.btnText || 'Ver paquete'} →</a>`
        : `<a href="https://wa.me/51987594032?text=${encodeURIComponent('Hola, quiero cotizar: ' + item.alt)}" target="_blank" rel="noopener noreferrer" class="flyer-card-link">Cotizar por WhatsApp →</a>`;

    return `
      <div class="col-6 col-md-4 col-lg-3">
        <div class="flyer-card">
          <div class="flyer-card-media">
            <img src="${item.src}" alt="${item.alt}" loading="lazy" class="flyer-card-img"
                 data-bs-toggle="modal" data-bs-target="#previewModal" onclick="updatePreview(this.src)">
            <span class="flyer-card-zoom"><i class="bi bi-arrows-fullscreen"></i></span>
            <h3 class="flyer-card-title">${item.alt}</h3>
          </div>
          <div class="flyer-card-body">
            <p class="flyer-card-desc">${item.description || ''}</p>
            ${linkHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (parentSection) {
    parentSection.classList.remove('hidden-section');
    parentSection.classList.add('fade-in-entry');
  }
}

function updatePreview(url) {
  const modalImg = document.getElementById('fullResImage');
  if (modalImg) modalImg.src = url;
}
window.updatePreview = updatePreview;

document.addEventListener('DOMContentLoaded', () => {
  loadTravelData();
  const myModalEl = document.getElementById('previewModal');
  if (myModalEl) {
    myModalEl.addEventListener('hidden.bs.modal', () => {
      document.getElementById('fullResImage').src = '';
    });
  }

});

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contactForm');
  const contactBtn = document.getElementById('contactSubmitBtn');

  if (contactForm && contactBtn) {
    contactForm.addEventListener('submit', () => {
      contactBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
      contactBtn.disabled = true;
    });
  }
});

// Links del mega-menu / navbar con data-tab activan la pestaña de Destinos
// correspondiente antes de hacer scroll (un href="#ancla" no activa un tab
// de Bootstrap por si solo).
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-tab]').forEach((link) => {
    link.addEventListener('click', () => {
      const targetButton = document.querySelector(`[data-bs-target="#tab-${link.dataset.tab}"]`);
      if (targetButton && window.bootstrap) {
        window.bootstrap.Tab.getOrCreateInstance(targetButton).show();
      }
    });
  });
});

// Buscador del hero: replica el widget del motor (origen/destino/fechas/pax)
// con autocompletado de ciudades EN VIVO (igual que el motor) y deep-link que
// cae directo en los resultados. El autocompletado consulta /api/suggest (una
// Netlify Function que hace de proxy al /suggestions del motor, porque ese
// endpoint no permite CORS desde el navegador). Los IDs son CIT_xxxx internos.
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('heroSearchForm');
  if (!form) return;

  // Formatea una fecha local como YYYY-MM-DD (sin desfase de zona horaria)
  const ymd = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Autocompletado de ciudad: input visible + <input hidden> con el CIT id.
  function setupCityAutocomplete(inputId, hiddenId, listId, def) {
    const input = document.getElementById(inputId);
    const hidden = document.getElementById(hiddenId);
    const list = document.getElementById(listId);
    if (!input || !hidden || !list) return null;

    if (def) { input.value = def.label; hidden.value = def.id; }

    let timer = null;
    const close = () => { list.classList.remove('show'); input.setAttribute('aria-expanded', 'false'); };

    const render = (cities) => {
      if (!cities.length) { close(); return; }
      list.innerHTML = cities.map((c) =>
        `<li class="hero-ac-item" role="option" data-id="${c.id}" data-label="${c.display.replace(/"/g, '&quot;')}"><i class="bi bi-geo-alt"></i><span>${c.display}</span></li>`
      ).join('');
      list.classList.add('show');
      input.setAttribute('aria-expanded', 'true');
      list.querySelectorAll('.hero-ac-item').forEach((li) => {
        // mousedown se dispara antes que el blur del input
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          input.value = li.dataset.label;
          hidden.value = li.dataset.id;
          close();
        });
      });
    };

    const search = async (q) => {
      try {
        const res = await fetch('/api/suggest?q=' + encodeURIComponent(q));
        if (!res.ok) throw new Error('http ' + res.status);
        const data = await res.json();
        const cityGroup = (data.items || []).find((g) => g.group === 'CITY');
        render((cityGroup?.items || []).slice(0, 7).map((it) => ({ id: it.id, display: it.display })));
      } catch (err) { close(); }
    };

    input.addEventListener('input', () => {
      hidden.value = ''; // se invalida hasta que elija una opcion
      const q = input.value.trim();
      clearTimeout(timer);
      if (q.length < 2) { close(); return; }
      timer = setTimeout(() => search(q), 250);
    });
    input.addEventListener('blur', () => setTimeout(close, 150));

    return { input, hidden };
  }

  const orig = setupCityAutocomplete('heroOrigenInput', 'heroOrigen', 'heroOrigenList', { id: 'CIT_4088', label: 'Lima, Lima, Perú' });
  const dest = setupCityAutocomplete('heroDestinoInput', 'heroDestino', 'heroDestinoList', { id: 'CIT_1579', label: 'Cusco, Cusco, Perú' });

  // Intercambiar origen <-> destino (texto + id)
  const swapBtn = document.getElementById('heroSwap');
  if (swapBtn && orig && dest) {
    swapBtn.addEventListener('click', () => {
      const ti = orig.input.value, th = orig.hidden.value;
      orig.input.value = dest.input.value; orig.hidden.value = dest.hidden.value;
      dest.input.value = ti; dest.hidden.value = th;
    });
  }

  // Fechas: no permitir pasado (min = hoy) y regreso siempre posterior a la salida
  const checkinEl = document.getElementById('heroCheckin');
  const checkoutEl = document.getElementById('heroCheckout');
  const todayStr = ymd(new Date());
  if (checkinEl) checkinEl.min = todayStr;
  if (checkoutEl) checkoutEl.min = todayStr;
  if (checkinEl && checkoutEl) {
    checkinEl.addEventListener('change', () => {
      if (!checkinEl.value) return;
      const p = checkinEl.value.split('-').map(Number);
      checkoutEl.min = ymd(new Date(p[0], p[1] - 1, p[2] + 1));
      if (checkoutEl.value && checkoutEl.value <= checkinEl.value) checkoutEl.value = '';
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const engine = 'https://viajeslmreps.e-agencias.com';
    const o = document.getElementById('heroOrigen').value;
    const d = document.getElementById('heroDestino').value;
    let checkin = checkinEl.value;
    let checkout = checkoutEl.value;
    const pax = Math.max(1, parseInt(document.getElementById('heroPax').value, 10) || 1);

    // Salvaguardas: nunca enviar fecha pasada ni regreso <= salida
    const today = ymd(new Date());
    if (!checkin || checkin < today) {
      const t = new Date(); t.setDate(t.getDate() + 14); checkin = ymd(t);
    }
    if (!checkout || checkout <= checkin) {
      const p = checkin.split('-').map(Number);
      checkout = ymd(new Date(p[0], p[1] - 1, p[2] + 7));
    }

    let url;
    if (o && d && o !== d) {
      // Deep-link al motor (flujo FH = paquete vuelo+hotel) que cae directo en
      // los resultados. Formato: /trip/start/FH/{orig}/{dest}/{in}/{out}/{dest}/{in}/{out}/{adultos}-0
      url = `${engine}/trip/start/FH/${o}/${d}/${checkin}/${checkout}/${d}/${checkin}/${checkout}/${pax}-0?from=PSB&nw=true&reSearch=true`;
    } else {
      url = `${engine}/paquetes`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  });
});

// Si se llega desde otra pagina con ?tab=carouselXxx (links del mega-menu
// en contactanos.html/tramites.html), activa esa pestaña de Destinos.
document.addEventListener('DOMContentLoaded', () => {
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (!tab) return;
  const targetButton = document.querySelector(`[data-bs-target="#tab-${tab}"]`);
  if (targetButton && window.bootstrap) {
    window.bootstrap.Tab.getOrCreateInstance(targetButton).show();
  }
});
