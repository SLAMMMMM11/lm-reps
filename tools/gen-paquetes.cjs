#!/usr/bin/env node
// =============================================================================
// GENERADOR DE PÁGINAS DE PAQUETE  (uso:  node tools/gen-paquetes.cjs)
// =============================================================================
// Lee los flyers en vivo de la tabla `promotions` de Supabase + el contenido
// curado de tools/paquetes-data.js, y genera:
//   - Pages/paquetes/{slug}.html  (1 por paquete, estático, con SEO + og:image)
//   - Assets/data/paquetes.json   (manifiesto para el home y las grillas de país)
//   - Actualiza el bloque de paquetes en sitemap.xml
//
// Cuando la dueña agregue/edite flyers en el panel: añade su contenido en
// tools/paquetes-data.js y vuelve a correr este script.
// =============================================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SUPA_URL = 'https://fwpuzvevenwhylryljjh.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3cHV6dmV2ZW53aHlscnlsampoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MTU2NTEsImV4cCI6MjA5NzQ5MTY1MX0.y-6ki1zQNRHPNihrJ2rDyuBnb3FpkpzdBAm-6MH7wLw';

const REGION_LABEL = {
  carouselnorteamerica: 'Norteamérica',
  carouselcentroamerica: 'Caribe',
  carouselsudamerica: 'Sudamérica',
  carouselasia: 'Asia',
  carouseleuropa: 'Europa',
  carouselpromos: 'Promociones',
};
// Orden de prioridad para elegir la región principal cuando un flyer está en varias.
const REGION_PRIORITY = ['carouselnorteamerica', 'carouselcentroamerica', 'carouselsudamerica', 'carouselasia', 'carouseleuropa', 'carouselpromos'];
const COUNTRY_LABEL = {
  peru: 'Perú', mexico: 'México', espana: 'España', 'estados-unidos': 'Estados Unidos',
  argentina: 'Argentina', 'emiratos-arabes': 'Emiratos Árabes', china: 'China',
  japon: 'Japón', tailandia: 'Tailandia', italia: 'Italia',
};
// País visible (destino) por paquete, para el filtro "por país" del catálogo.
// Incluye destinos que no tienen página propia (Colombia, Chile, India, etc.).
const DESTINO_BY_SLUG = {
  'usa-los-angeles-las-vegas-gran-canon': 'Estados Unidos', 'mundial-2026-usa': 'Estados Unidos',
  'circuitos-usa': 'Estados Unidos', 'orlando-fly-and-drive': 'Estados Unidos',
  'nueva-york-y-washington': 'Estados Unidos', 'las-vegas-y-gran-canon': 'Estados Unidos',
  'washington-nueva-york-y-boston': 'Estados Unidos',
  'china-milenaria': 'China', 'china-clasica-y-tokio': 'China y Japón',
  'corea-y-japon-tradicional': 'Corea y Japón', 'corea-pekin-y-shanghai': 'Corea y China',
  'lo-mejor-de-dubai': 'Emiratos Árabes', 'mega-turquia-y-dubai': 'Turquía y Dubái',
  'india-triangulo-dorado': 'India', 'india-triangulo-dorado-con-varanasi': 'India',
  'india-yoga-y-meditacion': 'India', 'mejor-india-y-nepal': 'India y Nepal',
  'conoce-europa-a-tu-estilo': 'Europa', 'gran-tour-de-europa': 'Europa',
  'gran-tour-europa-desde-lisboa': 'Europa', 'mega-europa-especial': 'Europa',
  'bellezas-de-londres-a-madrid': 'Europa', 'grecia-clasica-e-islas-cicladas': 'Grecia',
  'tesoros-de-grecia': 'Grecia', 'encantos-de-atenas-e-islas': 'Grecia',
  'carnavales-peruanos': 'Perú', 'escapada-iguazu': 'Argentina',
  'san-pedro-de-atacama': 'Chile', 'patagonia-chile': 'Chile', 'puerto-varas-chile': 'Chile',
  'cartagena-de-indias': 'Colombia', 'colombia-medellin-bogota-cartagena': 'Colombia',
  'medellin-y-las-tres-perlas-del-caribe': 'Colombia', 'escapada-a-medellin': 'Colombia',
  'rio-de-janeiro': 'Brasil', 'rio-de-janeiro-y-buzios': 'Brasil',
  'curacao-todo-incluido': 'Curaçao', 'aruba-isla-feliz': 'Aruba', 'montego-bay-jamaica': 'Jamaica',
  'punta-cana-semana-santa': 'Rep. Dominicana', 'punta-cana': 'Rep. Dominicana',
  'punta-cana-trs-turquesa': 'Rep. Dominicana', 'punta-cana-grand-palladium': 'Rep. Dominicana',
  'varadero-royalton': 'Cuba', 'vive-varadero': 'Cuba', 'especial-caribe-sol-y-amor': 'Caribe',
  'costa-mujeres-trs-coral': 'México', 'costa-mujeres-grand-palladium': 'México',
  'riviera-maya-trs-yucatan': 'México', 'riviera-maya-grand-palladium': 'México',
  'jamaica-grand-palladium': 'Jamaica', 'febrero-en-pareja': 'Varios destinos',
};
const WA = '51987594032';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function getLivePromotions() {
  const cache = path.join(__dirname, '_promotions_raw.json');
  const base = `${SUPA_URL}/rest/v1/promotions?is_active=eq.true&select=`;
  // Intenta el select completo (post-migración). Si las columnas nuevas aún no
  // existen, Supabase devuelve 400 → reintenta con el select básico. Así el
  // build nunca se rompe durante la transición.
  const selects = [
    'category,image_url,title,display_order,slug,subtitle,highlights,destino,pais,duration',
    'category,image_url,title,display_order',
  ];
  for (const sel of selects) {
    try {
      const res = await fetch(base + sel, { headers: { apikey: ANON } });
      if (!res.ok) throw new Error('http ' + res.status);
      const data = await res.json();
      fs.writeFileSync(cache, JSON.stringify(data, null, 2));
      return data;
    } catch (e) { /* probar el siguiente select */ }
  }
  console.warn('  (sin red) usando cache _promotions_raw.json');
  try { return JSON.parse(fs.readFileSync(cache, 'utf8')); } catch { return []; }
}

function buildPage(pkg, related) {
  const waText = encodeURIComponent(`Hola, quiero información del paquete: ${pkg.title}`);
  const waLink = `https://wa.me/${WA}?text=${waText}`;
  const desc = (pkg.subtitle + ' ' + pkg.highlights.join(', ')).slice(0, 155);
  const canonical = `https://lm-reps.com/paquete/${pkg.slug}`;
  const durationBadge = pkg.duration
    ? `<span class="paquete-badge"><i class="bi bi-calendar-week me-2"></i>${esc(pkg.duration)}</span>`
    : '';
  const highlights = pkg.highlights.map((h) => `<li><i class="bi bi-check-circle-fill"></i><span>${esc(h)}</span></li>`).join('\n                        ');

  const secondary = pkg.countries && pkg.countries.length
    ? `<a href="/destinos/${pkg.countries[0]}" class="btn btn-outline-secondary btn-lg">Ver destino: ${esc(COUNTRY_LABEL[pkg.countries[0]] || pkg.countries[0])}</a>`
    : `<a href="/#DestinosPromociones" class="btn btn-outline-secondary btn-lg">Ver más paquetes</a>`;

  const relatedCards = related.map((r) => `
                    <div class="col-6 col-md-4 col-lg-3">
                        <a href="/paquete/${r.slug}" class="flyer-card text-decoration-none d-block">
                            <div class="flyer-card-media">
                                <img src="${esc(r.image)}" alt="${esc(r.title)}" loading="lazy" class="flyer-card-img">
                                <h3 class="flyer-card-title">${esc(r.title)}</h3>
                            </div>
                            <div class="flyer-card-body">
                                <span class="flyer-card-link">Ver paquete →</span>
                            </div>
                        </a>
                    </div>`).join('');

  const relatedSection = related.length ? `
        <section class="section-padding bg-white">
            <div class="container">
                <div class="text-center mb-4">
                    <h2 class="promo-title">TAMBIÉN TE PUEDE <span style="color: var(--brand-primary);">INTERESAR</span></h2>
                </div>
                <div class="row g-4 justify-content-center">${relatedCards}
                </div>
            </div>
        </section>` : '';

  return `<!doctype html>
<html lang="es">

<head>
    <meta charset="utf-8" />
    <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-title" content="Viajes LM" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(pkg.title)} | VIAJES LM-REPS</title>
    <meta name="description" content="${esc(desc)}">
    <link rel="canonical" href="${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="es_PE">
    <meta property="og:site_name" content="Viajes LM-REPS">
    <meta property="og:title" content="${esc(pkg.title)} | VIAJES LM-REPS">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${esc(pkg.image)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(pkg.title)} | VIAJES LM-REPS">
    <meta name="twitter:description" content="${esc(desc)}">
    <meta name="twitter:image" content="${esc(pkg.image)}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="../../Assets/css/style.css">
</head>

<body>
    <header>
        <nav class="navbar navbar-expand-xl navbar-overlay">
            <div class="container">
                <a class="navbar-brand" href="/"><img src="../../Assets/img/og-image.png" alt="Logo"></a>
                <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto align-items-center gap-1">
                        <li class="nav-item"><a class="nav-link" href="/">Inicio</a></li>
                        <li class="nav-item"><a class="nav-link" href="/paquetes">Paquetes</a></li>
                        <li class="nav-item"><a class="nav-link" href="/informacion-de-viaje">Información de viaje</a></li>
                        <li class="nav-item"><a class="nav-link" href="/contactanos">Contáctanos</a></li>
                        <li class="nav-item dropdown account-dropdown ms-lg-1" id="navAccount">
                            <a class="nav-link account-toggle dropdown-toggle" href="#" id="navAccountToggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="bi bi-person-circle"></i><span class="account-label">Mi cuenta</span>
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end account-menu border-0">
                                <li class="account-out"><a class="dropdown-item" href="/login"><i class="bi bi-box-arrow-in-right me-2"></i>Iniciar sesión</a></li>
                                <li class="account-out"><a class="dropdown-item" href="/registro"><i class="bi bi-person-plus me-2"></i>Crear cuenta</a></li>
                                <li class="account-in d-none"><h6 class="dropdown-header" id="navAccountName">Mi cuenta</h6></li>
                                <li class="account-in d-none"><a class="dropdown-item" href="/cuenta"><i class="bi bi-grid-1x2 me-2"></i>Ir a mi cuenta</a></li>
                                <li class="account-in account-admin d-none"><a class="dropdown-item" href="/admin"><i class="bi bi-shield-lock me-2"></i>Panel admin</a></li>
                                <li class="account-in d-none"><hr class="dropdown-divider"></li>
                                <li class="account-in d-none"><a class="dropdown-item text-danger" href="#" id="navLogout"><i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión</a></li>
                            </ul>
                        </li>
                        <li class="nav-item ms-lg-3"><a class="nav-link btn-reserva text-center" href="${waLink}" target="_blank"><i class="bi bi-whatsapp me-2"></i>Reservar ahora</a></li>
                    </ul>
                </div>
            </div>
        </nav>
    </header>

    <main>
        <section class="paquete-hero">
            <div class="container">
                <nav aria-label="breadcrumb" class="paquete-breadcrumb">
                    <a href="/">Inicio</a> <span>/</span> <a href="/?tab=carouselPromos#DestinosPromociones">Paquetes</a> <span>/</span> <span class="current">${esc(pkg.title)}</span>
                </nav>
                <p class="paquete-eyebrow">Paquete · ${esc(pkg.regionLabel)}</p>
                <h1 class="paquete-title">${esc(pkg.title)}</h1>
                <p class="lead mb-0">${esc(pkg.subtitle)}</p>
            </div>
        </section>

        <section class="section-padding bg-light">
            <div class="container">
                <div class="row g-4 g-lg-5 align-items-start paquete-detail">
                    <div class="col-lg-5">
                        <div class="paquete-flyer-wrap" data-bs-toggle="modal" data-bs-target="#previewModal" onclick="updatePreview('${esc(pkg.image)}')">
                            <img src="${esc(pkg.image)}" alt="${esc(pkg.title)}" class="paquete-flyer">
                            <span class="paquete-flyer-zoom"><i class="bi bi-arrows-fullscreen me-1"></i>Ampliar afiche</span>
                        </div>
                    </div>
                    <div class="col-lg-7">
                        ${durationBadge}
                        <h2 class="h4 fw-bold mb-3">Lo que vivirás</h2>
                        <ul class="check-list">
                        ${highlights}
                        </ul>
                        <div class="paquete-note"><i class="bi bi-info-circle me-2"></i>Las fechas de salida y el precio final los confirma tu asesor según disponibilidad.</div>
                        <div class="d-flex flex-wrap gap-2 mt-4">
                            <button type="button" class="btn btn-brand-primary btn-lg border-0" data-bs-toggle="modal" data-bs-target="#cotizarModal"><i class="bi bi-clipboard-check me-2"></i>Solicitar cotización</button>
                            <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-success btn-lg"><i class="bi bi-whatsapp me-2"></i>WhatsApp</a>
                            ${secondary}
                        </div>
                    </div>
                </div>
            </div>
        </section>
${relatedSection}
        <section class="section-padding text-white text-center" style="background-color: var(--brand-secondary);">
            <div class="container">
                <h2 class="fw-bold mb-3">¿Te animas a este viaje?</h2>
                <p class="mb-4 text-white-50">Cuéntanos qué tienes en mente y armamos tu salida a tu medida, con opción de pagar en cuotas.</p>
                <button type="button" class="btn btn-brand-primary btn-lg border-0" data-bs-toggle="modal" data-bs-target="#cotizarModal"><i class="bi bi-clipboard-check me-2"></i>Solicitar cotización</button>
                <div class="mt-3"><a href="${waLink}" target="_blank" rel="noopener noreferrer" class="link-light small"><i class="bi bi-whatsapp me-1"></i>o escríbenos directo por WhatsApp</a></div>
            </div>
        </section>
    </main>

    <!-- MODAL SOLICITAR COTIZACIÓN (Netlify Forms) -->
    <div class="modal fade" id="cotizarModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0">
          <div class="modal-header border-0 pb-0">
            <h5 class="modal-title fw-bold">Solicitar cotización</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
          </div>
          <div class="modal-body">
            <p class="text-muted small mb-4">Déjanos tus datos y un asesor te contactará con fechas y precio. Al enviar también se abrirá WhatsApp con tu solicitud.</p>
            <form id="cotizarForm">
              <input type="hidden" name="paquete" value="${esc(pkg.title)}">
              <p class="d-none" aria-hidden="true"><label>No llenar: <input name="gotcha" tabindex="-1" autocomplete="off"></label></p>
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label small fw-bold">Nombre completo *</label>
                  <input type="text" name="nombre" class="form-control" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold">Teléfono / WhatsApp *</label>
                  <input type="tel" name="telefono" class="form-control" required>
                </div>
                <div class="col-md-6">
                  <label class="form-label small fw-bold">Correo electrónico *</label>
                  <input type="email" name="email" class="form-control" required>
                </div>
                <div class="col-6 col-md-3">
                  <label class="form-label small fw-bold">N° personas</label>
                  <input type="number" name="personas" min="1" class="form-control" placeholder="2">
                </div>
                <div class="col-6 col-md-3">
                  <label class="form-label small fw-bold">Fecha tentativa</label>
                  <input type="date" name="fecha" class="form-control">
                </div>
                <div class="col-12">
                  <label class="form-label small fw-bold">Comentarios</label>
                  <textarea name="mensaje" rows="3" class="form-control" placeholder="¿Algo que debamos saber? (ciudad de salida, presupuesto, etc.)"></textarea>
                </div>
              </div>
              <div id="cotizarStatus" class="d-none"></div>
              <div class="d-grid d-sm-flex justify-content-sm-end gap-2 mt-4">
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-brand-primary border-0" id="cotizarSubmit"><i class="bi bi-send me-2"></i>Enviar solicitud</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL DE PREVIEW -->
    <div class="modal fade" id="previewModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content" style="background: rgba(0,0,0,0.9); border: none;">
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="position: absolute; right: 15px; top: 15px; z-index: 10;"></button>
          <div class="modal-body p-0 text-center">
            <img src="" id="fullResImage" class="img-fluid img-preview-custom" alt="Vista previa">
          </div>
        </div>
      </div>
    </div>

    <footer class="pt-5 pb-3">
        <div class="container">
            <div class="row g-4">
                <div class="col-md-4">
                    <h6>VIAJES LM-REPS</h6>
                    <p class="small">Tu agencia de viajes especialista en crear memorias inolvidables.</p>
                    <img src="../../Assets/img/og-image.png" alt="Logo" style="max-height: 60px;" loading="lazy" class="mt-2 rounded p-1 shadow-sm">
                    <div class="footer-social mt-3">
                        <a href="https://www.facebook.com/lmreps" target="_blank"><i class="bi bi-facebook"></i></a>
                        <a href="https://www.instagram.com/viajes_lm_reps/" target="_blank"><i class="bi bi-instagram"></i></a>
                        <a href="https://www.tiktok.com/@viajes.lm.reps" target="_blank"><i class="bi bi-tiktok"></i></a>
                        <a href="https://wa.me/51987594032" target="_blank"><i class="bi bi-whatsapp"></i></a>
                    </div>
                </div>
                <div class="col-md-2">
                    <h6>EXPLORA</h6>
                    <ul class="list-unstyled small">
                        <li><a href="/">Inicio</a></li>
                        <li><a href="/paquetes">Paquetes</a></li>
                        <li><a href="/informacion-de-viaje">Información de viaje</a></li>
                        <li><a href="/libro-de-reclamaciones">Libro de Reclamaciones</a></li>
                    </ul>
                </div>
                <div class="col-md-3">
                    <h6>CONTACTO</h6>
                    <p class="small mb-1"><i class="bi bi-envelope text-warning me-2"></i>reservas@lm-reps.com</p>
                    <p class="small"><i class="bi bi-telephone text-warning me-2"></i>(+51) 987 594 032</p>
                </div>
                <div class="col-md-3">
                    <h6>PAGOS SEGUROS</h6>
                    <img src="../../Assets/img/medios_de_pago.jpeg" style="max-height: 140px;" alt="Pagos" loading="lazy" class="img-fluid rounded shadow-sm p-2">
                </div>
            </div>
            <hr class="mt-4 opacity-10">
            <div class="text-center small opacity-50">VIAJES LM-REPS &copy; 2024 Todos los derechos reservados.</div>
        </div>
    </footer>

    <!-- Widget flotante de asesora -->
    <div class="asesor-fab" id="asesorFab">
      <div class="asesor-card">
        <button type="button" class="asesor-card-close" aria-label="Cerrar">&times;</button>
        <div class="asesor-card-head">
          <img src="/Assets/img/call-center.webp" alt="Asesora de viajes" class="asesor-card-img">
          <div class="asesor-card-id">
            <strong>Asesora de viajes</strong>
            <span class="asesor-online"><span class="asesor-dot"></span>En línea ahora</span>
          </div>
        </div>
        <p class="asesor-card-text">👋 ¡Hola! ¿Te ayudo a planear o cotizar tu próximo viaje?</p>
        <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="btn btn-success w-100"><i class="bi bi-whatsapp me-2"></i>Chatear por WhatsApp</a>
      </div>
      <button type="button" class="asesor-toggle" aria-label="Chatear con una asesora">
        <img src="/Assets/img/call-center.webp" alt="Asesora" class="asesor-toggle-img">
        <span class="asesor-badge"><i class="bi bi-whatsapp"></i></span>
        <span class="asesor-ping"></span>
      </button>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script type="module" src="../../Assets/scripts/nav-session.js"></script>
    <script src="../../Assets/scripts/navbar-scroll.js" defer></script>
    <script src="/Assets/scripts/asesor-fab.js" defer></script>
    <script type="module" src="../../Assets/scripts/solicitud.js"></script>
    <script>
      function updatePreview(u) { var m = document.getElementById('fullResImage'); if (m) m.src = u; }
      document.addEventListener('DOMContentLoaded', function () {
        var el = document.getElementById('previewModal');
        if (el) el.addEventListener('hidden.bs.modal', function () { document.getElementById('fullResImage').src = ''; });
      });
    </script>
</body>

</html>
`;
}

(async () => {
  const curated = require('./paquetes-data.js');
  const curatedByFile = new Map(curated.map((c) => [c.file.toLowerCase(), c]));
  const live = await getLivePromotions();

  // filename -> { urls[], categories, slugRow }. Un mismo afiche puede estar en
  // varias filas/URLs (categorías distintas): guardamos TODAS las URLs para que
  // el home enlace cualquier variante, y la fila "principal" (la que tiene slug).
  const byFile = new Map();
  for (const r of live) {
    const fn = r.image_url.split('/').pop().toLowerCase();
    if (!byFile.has(fn)) byFile.set(fn, { urls: [], categories: new Set(), slugRow: null });
    const e = byFile.get(fn);
    if (!e.urls.includes(r.image_url)) e.urls.push(r.image_url);
    e.categories.add(r.category);
    if (r.slug && !e.slugRow) e.slugRow = r;
  }

  // Combina la fila de la BD (lo que edita la dueña) con el respaldo curado.
  function buildPkg(row) {
    const fn = row.image_url.split('/').pop().toLowerCase();
    const info = byFile.get(fn);
    const fb = curatedByFile.get(fn) || {};
    const cats = [...info.categories];
    const primary = REGION_PRIORITY.find((k) => cats.includes(k)) || cats[0] || 'carouselpromos';
    const slug = row.slug || fb.slug;
    const pais = row.pais || (fb.countries && fb.countries[0]) || null;
    return {
      slug,
      title: row.title || fb.title || slug,
      subtitle: row.subtitle || fb.subtitle || '',
      highlights: (Array.isArray(row.highlights) && row.highlights.length ? row.highlights : fb.highlights) || [],
      duration: row.duration || fb.duration || '',
      image: row.image_url,
      images: info.urls,
      categories: cats,
      regionKey: primary,
      regionLabel: REGION_LABEL[primary] || 'Promociones',
      destino: row.destino || DESTINO_BY_SLUG[slug] || REGION_LABEL[primary] || 'Otros',
      countries: pais ? [pais] : [],
    };
  }

  // Fuente de verdad: las filas de la BD con `slug` (lo que la dueña administra).
  // Si todavía no se corrió la migración/backfill (no hay slugs), se usa el
  // archivo curado `paquetes-data.js` como respaldo, para no romper el sitio.
  const dbPackageRows = live.filter((r) => r.slug);
  let packages;
  const missing = [];
  if (dbPackageRows.length) {
    packages = dbPackageRows.map(buildPkg);
  } else {
    packages = [];
    for (const c of curated) {
      const info = byFile.get(c.file.toLowerCase());
      if (!info) { missing.push(c.file); continue; }
      const cats = [...info.categories];
      const primary = REGION_PRIORITY.find((k) => cats.includes(k)) || cats[0] || 'carouselpromos';
      packages.push({
        ...c, image: info.urls[0], images: info.urls, categories: cats,
        regionKey: primary, regionLabel: REGION_LABEL[primary] || 'Promociones',
        destino: DESTINO_BY_SLUG[c.slug] || REGION_LABEL[primary] || 'Otros',
        countries: c.countries || [],
      });
    }
  }

  // Avisar flyers en vivo SIN slug ni respaldo curado (para agregarles contenido)
  const curatedFiles = new Set(curated.map((c) => c.file.toLowerCase()));
  const uncovered = [...byFile.entries()].filter(([f, e]) => !e.slugRow && !curatedFiles.has(f)).map(([f]) => f);

  // Generar páginas
  const outDir = path.join(ROOT, 'Pages', 'paquetes');
  fs.mkdirSync(outDir, { recursive: true });
  for (const pkg of packages) {
    const related = packages.filter((p) => p.regionKey === pkg.regionKey && p.slug !== pkg.slug).slice(0, 4);
    fs.writeFileSync(path.join(outDir, pkg.slug + '.html'), buildPage(pkg, related));
  }

  // Manifiesto para el home y las grillas de país
  const manifest = packages.map((p) => ({
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    image: p.image,
    images: p.images,
    region: p.regionLabel,
    regionKey: p.regionKey,
    destino: p.destino,
    countries: p.countries || [],
  }));
  fs.mkdirSync(path.join(ROOT, 'Assets', 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'Assets', 'data', 'paquetes.json'), JSON.stringify(manifest, null, 2));

  // Actualizar sitemap.xml (bloque idempotente de paquetes)
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  let xml = fs.readFileSync(sitemapPath, 'utf8');
  xml = xml.replace(/\s*<url>\s*<loc>https:\/\/lm-reps\.com\/paquete\/[^<]*<\/loc>[\s\S]*?<\/url>/g, '');
  const block = packages.map((p) =>
    `  <url>\n    <loc>https://lm-reps.com/paquete/${p.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
  ).join('\n');
  xml = xml.replace('</urlset>', block + '\n</urlset>');
  fs.writeFileSync(sitemapPath, xml);

  console.log(`Generadas ${packages.length} páginas en Pages/paquetes/`);
  console.log(`Manifiesto: Assets/data/paquetes.json (${manifest.length} paquetes)`);
  console.log(`Sitemap actualizado.`);
  if (missing.length) console.warn(`AVISO: ${missing.length} archivos curados no están en la base:`, missing);
  if (uncovered.length) console.warn(`AVISO: ${uncovered.length} flyers en la base SIN contenido curado:`, uncovered);
})();
