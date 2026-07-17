#!/usr/bin/env node
// =============================================================================
// GENERADOR DE PÁGINAS DE CIRCUITO (paquetes hechos desde catálogos MAPAPLUS)
//   uso:  node tools/gen-circuito.cjs [slug ...]   (sin args = todos)
// Lee los datos de tools/circuitos/{slug}.cjs y produce
// Pages/paquetes/{slug}.html con la estructura premium (hero, stats, cinta
// pq-gallery, acordeón día a día, incluye, Plus P+, precios, hoteles/fechas,
// relacionados, modal cotizar, JSON-LD). Los slugs se auto-registran en el
// manifiesto vía tools/paquetes-custom.js (lee la carpeta circuitos/).
// =============================================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(__dirname, 'circuitos');
const WA = '51987594032';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function navbar() {
  return `    <nav class="navbar navbar-expand-xl navbar-overlay">
      <div class="container">
        <a class="navbar-brand" href="/"><img src="../../Assets/img/og-image.png" alt="Logo"></a>
        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto align-items-center gap-1">
            <li class="nav-item"><a class="nav-link" href="/">Inicio</a></li>
            <li class="nav-item dropdown" id="navDestinos">
              <a class="nav-link dropdown-toggle" href="#" id="navDestinosToggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">Destinos</a>
              <ul class="dropdown-menu border-0 shadow-sm" aria-labelledby="navDestinosToggle" id="navDestinosMenu">
                <li data-country="peru"><a class="dropdown-item" href="/destinos/peru">Perú</a></li>
                <li data-country="mexico"><a class="dropdown-item" href="/destinos/mexico">México</a></li>
                <li data-country="espana"><a class="dropdown-item" href="/destinos/espana">España</a></li>
                <li data-country="estados-unidos"><a class="dropdown-item" href="/destinos/estados-unidos">Estados Unidos</a></li>
                <li data-country="argentina"><a class="dropdown-item" href="/destinos/argentina">Argentina</a></li>
                <li data-country="emiratos-arabes"><a class="dropdown-item" href="/destinos/emiratos-arabes">Emiratos Árabes</a></li>
                <li data-country="china"><a class="dropdown-item" href="/destinos/china">China</a></li>
                <li data-country="japon"><a class="dropdown-item" href="/destinos/japon">Japón</a></li>
                <li data-country="tailandia"><a class="dropdown-item" href="/destinos/tailandia">Tailandia</a></li>
                <li data-country="italia"><a class="dropdown-item" href="/destinos/italia">Italia</a></li>
              </ul>
            </li>
            <li class="nav-item"><a class="nav-link" href="/paquetes">Paquetes</a></li>
            <li class="nav-item"><a class="nav-link" href="/promociones">Promociones</a></li>
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
            <li class="nav-item ms-lg-3"><a class="nav-link btn-reserva text-center" href="https://wa.me/${WA}" target="_blank"><i class="bi bi-whatsapp me-2"></i>Reservar ahora</a></li>
          </ul>
        </div>
      </div>
    </nav>`;
}

function build(d) {
  const url = `https://lm-reps.com/paquete/${d.slug}`;
  const waText = encodeURIComponent(`Hola, quiero información del paquete: ${d.title}`);
  const waLink = `https://wa.me/${WA}?text=${waText}`;

  const pills = d.ruta.map((c, i) =>
    `<span class="route-pill"><i class="bi bi-${i === 0 ? 'geo-alt-fill' : 'arrow-right'}"></i>${esc(c)}</span>`).join('\n          ');

  const chips = [
    `<span class="stat-chip"><i class="bi bi-calendar-week"></i>${esc(d.dias)}</span>`,
    `<span class="stat-chip"><i class="bi bi-currency-dollar"></i>Desde $${esc(d.desde)} USD</span>`,
    d.salidasChip ? `<span class="stat-chip"><i class="bi bi-airplane-fill"></i>${esc(d.salidasChip)}</span>` : '',
    `<span class="stat-chip"><i class="bi bi-translate"></i>Guía bilingüe</span>`,
    `<span class="stat-chip"><i class="bi bi-shield-check"></i>Seguro MAPAPLUS</span>`,
  ].filter(Boolean).join('\n          ');

  const highlights = d.highlights.map((h) =>
    `<li class="d-flex align-items-start gap-2 mb-2"><i class="bi bi-check-circle-fill text-success mt-1 flex-shrink-0"></i><span>${h}</span></li>`).join('\n              ');

  const galeria = d.galeria.map(([img, cap]) => `
                  <figure class="pq-gallery-item m-0">
                    <img src="${esc(img)}" alt="${esc(cap)}" loading="lazy" draggable="false">
                    <figcaption class="pq-gallery-caption"><i class="bi bi-geo-alt me-1"></i>${esc(cap)}</figcaption>
                  </figure>`).join('');

  const dias = d.itinerario.map((dia, i) => {
    const n = i + 1;
    const img = dia.img ? `\n                <img src="${esc(dia.img)}" alt="${esc(dia.titulo)}" class="itinerary-img" loading="lazy">` : '';
    const km = dia.km ? ` <span class="text-muted small fw-normal ms-1">${esc(dia.km)}</span>` : '';
    const cuerpo = dia.variantes
      ? `<div class="row g-3">${dia.variantes.map((v) => `
                  <div class="col-sm-6"><div class="border rounded-3 p-3"><p class="fw-bold small mb-1">${esc(v.titulo)}</p><p class="mb-0 small">${v.texto}</p></div></div>`).join('')}
                </div>`
      : `${img ? '' : ''}<p class="text-muted mb-0">${dia.texto}</p>`;
    return `
          <div class="accordion-item border-0 mb-2 rounded-3 shadow-sm overflow-hidden">
            <h3 class="accordion-header">
              <button class="accordion-button collapsed fw-semibold" type="button" data-bs-toggle="collapse" data-bs-target="#dia${n}">
                <span class="pq-day-num">${n}</span>${esc(dia.titulo)}${km}
              </button>
            </h3>
            <div id="dia${n}" class="accordion-collapse collapse" data-bs-parent="#itinerarioAccordion">
              <div class="accordion-body${dia.img || dia.variantes ? '' : ' text-muted'}">${img}
                ${cuerpo}
              </div>
            </div>
          </div>`;
  }).join('\n');

  const incluye = d.incluye.map((x) => `<li class="mb-2 d-flex gap-2"><i class="bi bi-check2 text-success mt-1 flex-shrink-0"></i><span>${x}</span></li>`);
  const mitad = Math.ceil(incluye.length / 2);
  const noIncluye = d.noIncluye.map((x) => `<li class="mb-2 d-flex gap-2"><i class="bi bi-x text-danger fw-bold mt-1 flex-shrink-0"></i><span>${x}</span></li>`).join('\n                ');

  const plusSec = d.plus ? `
    <!-- PAQUETE PLUS -->
    <section class="section-padding bg-white">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-10">
            <div class="rounded-4 p-4 p-md-5 pq-plus-card">
              <div class="row g-4 align-items-center">
                <div class="col-md-4 text-center">
                  <i class="bi bi-stars display-3"></i>
                  <h3 class="fw-bold mt-2 mb-0">Paquete Plus P+</h3>
                  <div class="pq-plus-price mt-1">$${esc(d.plus.precio)}</div>
                  <p class="text-muted small mb-3">USD por persona</p>
                  <button type="button" class="btn btn-brand-primary border-0 w-100" data-bs-toggle="modal" data-bs-target="#cotizarModal">Cotizar con Plus P+</button>
                </div>
                <div class="col-md-8">
                  <div class="row g-3">
                    <div class="col-sm-6">
                      <h6 class="fw-bold"><i class="bi bi-cup-hot-fill me-2"></i>${d.plus.comidas.length} comidas</h6>
                      <ul class="list-unstyled small text-muted mb-0">
                        ${d.plus.comidas.map((c) => `<li><i class="bi bi-dot"></i>${esc(c)}</li>`).join('\n                        ')}
                      </ul>
                    </div>
                    <div class="col-sm-6">
                      <h6 class="fw-bold"><i class="bi bi-ticket-perforated-fill me-2"></i>${d.plus.extras.length} extras</h6>
                      <ul class="list-unstyled small text-muted mb-0">
                        ${d.plus.extras.map((c) => `<li><i class="bi bi-dot"></i>${esc(c)}</li>`).join('\n                        ')}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>` : '';

  const cabecera = d.precios.columnas.map((c, i) => `<th${i === d.precios.mejorCol ? ' class="pq-best-col"' : ''}>${esc(c)}</th>`).join('\n                ');
  const filas = d.precios.filas.map((f, fi) => {
    const zebra = Math.floor(fi / 2) % 2 === 1 ? ' class="table-light"' : '';
    const rowspan = fi % 2 === 0 ? `<td rowspan="2" class="text-start fw-semibold">${f.tour}</td>\n                ` : '';
    const celdas = f.valores.map((v, i) => `<td class="${fi % 2 === 0 ? 'fw-semibold ' : ''}${i === d.precios.mejorCol ? 'pq-best-col' : ''}">$${esc(v)}</td>`).join('');
    return `              <tr${zebra}>
                ${rowspan}<td class="text-start">${esc(f.categoria)}</td>
                ${celdas}
              </tr>`;
  }).join('\n');

  const hoteles = d.hoteles ? `
          <div class="col-lg-7">
            <h2 class="fw-bold mb-3">Hoteles previstos o similares</h2>
            <div class="table-responsive rounded-4 shadow-sm">
              <table class="table table-bordered align-middle mb-0 small pq-hotel-table">
                <thead>
                  <tr><th>Ciudad</th><th>Confort 3*/4*</th><th>Superior 4*</th></tr>
                </thead>
                <tbody>
                  ${d.hoteles.map((h) => h.ambos
                    ? `<tr><td class="fw-semibold">${esc(h.ciudad)}</td><td colspan="2">${esc(h.ambos)}</td></tr>`
                    : `<tr><td class="fw-semibold">${esc(h.ciudad)}</td><td>${esc(h.confort)}</td><td>${esc(h.superior)}</td></tr>`).join('\n                  ')}
                </tbody>
              </table>
            </div>
          </div>` : '<div class="col-lg-7"></div>';

  const fechas = d.fechas.libre ? `
            <p class="text-muted small">${d.fechas.libre}</p>` : `
            <p class="text-muted small">${d.fechas.intro}</p>
            <div class="row g-3">
              <div class="col-6">
                <div class="bg-light rounded-3 p-3 pq-year-box">
                  <p class="fw-bold small text-uppercase mb-2 pq-year-label">2026</p>
                  <ul class="list-unstyled small mb-0">
                    ${d.fechas.y2026.map((l) => `<li>${l}</li>`).join('\n                    ')}
                  </ul>
                </div>
              </div>
              <div class="col-6">
                <div class="bg-light rounded-3 p-3 pq-year-box">
                  <p class="fw-bold small text-uppercase mb-2 pq-year-label">2027</p>
                  <ul class="list-unstyled small mb-0">
                    ${d.fechas.y2027.map((l) => `<li>${l}</li>`).join('\n                    ')}
                  </ul>
                </div>
              </div>
            </div>`;

  const relacionados = d.relacionados.map((r) => `
          <div class="col-6 col-md-4 col-lg-3">
            <a href="/paquete/${r.slug}" class="flyer-card text-decoration-none d-block">
              <div class="flyer-card-media">
                <img src="${esc(r.img)}" alt="${esc(r.title)}" loading="lazy" class="flyer-card-img">
                <h3 class="flyer-card-title">${esc(r.title)}</h3>
              </div>
              <div class="flyer-card-body"><span class="flyer-card-link">Ver paquete →</span></div>
            </a>
          </div>`).join('');

  const ld = JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: d.title,
      description: d.metaDescription,
      image: d.hero,
      url,
      touristType: 'Viajeros desde Perú',
      provider: { '@type': 'TravelAgency', name: 'Viajes LM-REPS', url: 'https://lm-reps.com', telephone: '+51 987 594 032' },
      offers: { '@type': 'Offer', price: d.desde.replace(/[.,]/g, ''), priceCurrency: 'USD', availability: 'https://schema.org/InStock', url },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://lm-reps.com/' },
        { '@type': 'ListItem', position: 2, name: 'Paquetes', item: 'https://lm-reps.com/paquetes' },
        { '@type': 'ListItem', position: 3, name: d.title, item: url },
      ],
    },
  ]).replace(/</g, '\\u003c');

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
  <title>${esc(d.title)} — ${esc(d.dias)} | VIAJES LM-REPS</title>
  <meta name="description" content="${esc(d.metaDescription)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_PE">
  <meta property="og:site_name" content="Viajes LM-REPS">
  <meta property="og:title" content="${esc(d.title)} — ${esc(d.dias)} | VIAJES LM-REPS">
  <meta property="og:description" content="${esc(d.metaDescription)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${esc(d.hero)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(d.title)} — ${esc(d.dias)} | VIAJES LM-REPS">
  <meta name="twitter:description" content="${esc(d.metaDescription)}">
  <meta name="twitter:image" content="${esc(d.hero)}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Outfit:wght@500;600;700;800&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&display=swap" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <link rel="stylesheet" href="../../Assets/css/style.css">
  <link rel="stylesheet" href="../../Assets/css/paquetes-premium.css">
  <script type="application/ld+json">${ld}</script>

  <style>
    /* Base estructural del hero — las reglas de diseño están en paquetes-premium.css */
    .espana-hero {
      position: relative;
      min-height: 520px;
      display: flex;
      align-items: flex-end;
      background: url('${d.hero}') center center / cover no-repeat;
    }
    .espana-hero::before { content: ''; position: absolute; inset: 0; }
    .espana-hero .hero-content { position: relative; z-index: 1; color: #fff; }
    .stat-chip { display: inline-flex; align-items: center; gap: .4rem; padding: .4rem .9rem; font-size: .83rem; font-weight: 600; }
    .route-pill { display: inline-flex; align-items: center; gap: .3rem; color: #fff; border-radius: 30px; padding: .28rem .75rem; margin: .2rem .1rem; }
    .itinerary-img { width: 100%; object-fit: cover; margin-bottom: .75rem; }
  </style>
</head>

<body>
  <header>
${navbar()}
  </header>

  <main>
    <!-- HERO -->
    <section class="espana-hero">
      <div class="container hero-content">
        <nav aria-label="breadcrumb" class="mb-2">
          <ol class="breadcrumb mb-0" style="opacity:.7; font-size:.8rem;">
            <li class="breadcrumb-item"><a href="/" class="text-white text-decoration-none">Inicio</a></li>
            <li class="breadcrumb-item"><a href="/paquetes" class="text-white text-decoration-none">Paquetes</a></li>
            <li class="breadcrumb-item text-white active">${esc(d.title)}</li>
          </ol>
        </nav>
        <p class="mb-1" style="color:rgba(255,255,255,.7); font-size:.82rem; text-transform:uppercase; letter-spacing:1.5px;">${esc(d.eyebrow)}</p>
        <h1 class="display-4 fw-bold mb-3">${esc(d.title)}</h1>
        <div class="d-flex flex-wrap mb-4">
          ${pills}
        </div>
        <div class="d-flex flex-wrap gap-3">
          <button type="button" class="btn btn-brand-primary btn-lg border-0 px-4" data-bs-toggle="modal" data-bs-target="#cotizarModal">
            <i class="bi bi-clipboard-check me-2"></i>Solicitar cotización
          </button>
          <a href="${waLink}" target="_blank" class="btn btn-success btn-lg px-4">
            <i class="bi bi-whatsapp me-2"></i>WhatsApp
          </a>
        </div>
      </div>
    </section>

    <!-- STATS BAR -->
    <div class="py-3 pq-stats-bar">
      <div class="container">
        <div class="d-flex flex-wrap gap-2">
          ${chips}
        </div>
      </div>
    </div>

    <!-- GALERÍA + HIGHLIGHTS -->
    <section class="section-padding pq-gallery-section pq-highlights-section">
      <div class="container">
        <div class="row g-4 g-lg-5 align-items-center">
          <div class="col-lg-5">
            <p class="pq-eyebrow text-uppercase fw-bold small mb-1" style="letter-spacing:1px;">Lo que te espera</p>
            <h2 class="pq-section-title fw-bold mb-3">${esc(d.subtituloHighlights)}</h2>
            <ul class="list-unstyled mb-0">
              ${highlights}
            </ul>
          </div>
          <div class="col-lg-7">
            <div class="pq-gallery-outer">
              <button class="pq-gallery-nav pq-gallery-nav--prev" id="pqGalleryPrev" aria-label="Anterior"><i class="bi bi-chevron-left"></i></button>
              <div class="pq-gallery-wrap" id="pqGallery">
                <div class="pq-gallery-track">${galeria}
                </div>
              </div>
              <button class="pq-gallery-nav pq-gallery-nav--next" id="pqGalleryNext" aria-label="Siguiente"><i class="bi bi-chevron-right"></i></button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ITINERARIO DÍA A DÍA -->
    <section class="section-padding bg-white pq-itinerary-section">
      <div class="container">
        <div class="text-center mb-5">
          <p class="pq-eyebrow text-uppercase fw-bold small mb-1" style="letter-spacing:1px;">Día a día</p>
          <h2 class="pq-section-title fw-bold">Itinerario completo</h2>
        </div>
        <div class="accordion" id="itinerarioAccordion">
${dias}
        </div>
      </div>
    </section>

    <!-- QUÉ INCLUYE / NO INCLUYE -->
    <section class="section-padding pq-includes-section">
      <div class="container">
        <h2 class="fw-bold mb-4 text-center pq-section-title">¿Qué incluye?</h2>
        <div class="row g-3">
          <div class="col-md-7">
            <div class="bg-white rounded-4 shadow-sm p-4 h-100 pq-includes-card">
              <h5 class="fw-bold mb-3 text-success"><i class="bi bi-check-circle-fill me-2"></i>Incluye</h5>
              <div class="row g-0">
                <div class="col-sm-6">
                  <ul class="list-unstyled small mb-0">
                    ${incluye.slice(0, mitad).join('\n                    ')}
                  </ul>
                </div>
                <div class="col-sm-6">
                  <ul class="list-unstyled small mb-0">
                    ${incluye.slice(mitad).join('\n                    ')}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-5">
            <div class="bg-white rounded-4 shadow-sm p-4 h-100 pq-excludes-card">
              <h5 class="fw-bold mb-3 text-danger"><i class="bi bi-x-circle-fill me-2"></i>No incluye</h5>
              <ul class="list-unstyled small mb-0">
                ${noIncluye}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
${plusSec}
    <!-- TABLA DE PRECIOS -->
    <section class="section-padding pq-prices-section">
      <div class="container">
        <div class="text-center mb-4">
          <p class="pq-eyebrow text-uppercase fw-bold small mb-1">Tarifas</p>
          <h2 class="fw-bold pq-section-title">Precios por temporada</h2>
          <p class="text-muted small">Por persona en USD · Habitación doble</p>
        </div>
        <div class="table-responsive rounded-4 shadow-sm">
          <table class="table table-bordered table-hover align-middle mb-0 bg-white text-center pq-price-table">
            <thead>
              <tr>
                <th class="text-start">Tour</th>
                <th>Categoría</th>
                ${cabecera}
              </tr>
            </thead>
            <tbody>
${filas}
            </tbody>
          </table>
        </div>
        <p class="text-muted small mt-2 text-center">${esc(d.precios.nota)}</p>
      </div>
    </section>

    <!-- HOTELES Y FECHAS -->
    <section class="section-padding pq-hotels-section">
      <div class="container">
        <div class="row g-4 g-lg-5">
${hoteles}
          <div class="col-lg-5">
            <h2 class="fw-bold mb-3">Fechas de salida</h2>${fechas}
          </div>
        </div>
      </div>
    </section>

    <!-- PAQUETES RELACIONADOS -->
    <section class="section-padding bg-light">
      <div class="container">
        <div class="text-center mb-4">
          <h2 class="promo-title">TAMBIÉN TE PUEDE <span style="color:var(--brand-primary);">INTERESAR</span></h2>
        </div>
        <div class="row g-4 justify-content-center">${relacionados}
        </div>
      </div>
    </section>

    <!-- CTA FINAL -->
    <section class="section-padding text-white text-center pq-cta-final">
      <div class="container">
        <h2 class="fw-bold mb-3">${esc(d.cta)}</h2>
        <p class="mb-4 text-white-50">Cuéntanos tus fechas y armamos tu salida a la medida, con opción de pagar en cuotas.</p>
        <button type="button" class="btn btn-brand-primary btn-lg border-0 px-5" data-bs-toggle="modal" data-bs-target="#cotizarModal">
          <i class="bi bi-clipboard-check me-2"></i>Solicitar cotización
        </button>
        <div class="mt-3">
          <a href="${waLink}" target="_blank" class="link-light small">
            <i class="bi bi-whatsapp me-1"></i>o escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </section>

  </main>

  <!-- MODAL COTIZACIÓN -->
  <div class="modal fade" id="cotizarModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content border-0">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold">Solicitar cotización — ${esc(d.title)}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <form id="cotizarForm">
            <input type="hidden" name="paquete" value="${esc(d.title)}">
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
                <textarea name="mensaje" rows="2" class="form-control" placeholder="Ciudad de salida, categoría, Paquete Plus P+, etc."></textarea>
              </div>
            </div>
            <div id="cotizarStatus" class="d-none mt-3"></div>
            <div class="d-flex justify-content-end gap-2 mt-4">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="submit" class="btn btn-brand-primary border-0" id="cotizarSubmit"><i class="bi bi-send me-2"></i>Enviar</button>
            </div>
          </form>
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
          <img src="../../Assets/img/og-image.png" alt="Logo" style="max-height:60px;" loading="lazy" class="mt-2 rounded p-1 shadow-sm">
          <div class="footer-social mt-3">
            <a href="https://www.facebook.com/lmreps" target="_blank"><i class="bi bi-facebook"></i></a>
            <a href="https://www.instagram.com/viajes_lm_reps/" target="_blank"><i class="bi bi-instagram"></i></a>
            <a href="https://www.tiktok.com/@viajes.lm.reps" target="_blank"><i class="bi bi-tiktok"></i></a>
            <a href="https://wa.me/${WA}" target="_blank"><i class="bi bi-whatsapp"></i></a>
          </div>
        </div>
        <div class="col-md-2">
          <h6>EXPLORA</h6>
          <ul class="list-unstyled small">
            <li><a href="/">Inicio</a></li>
            <li><a href="/paquetes">Paquetes</a></li>
            <li><a href="/promociones">Promociones</a></li>
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
          <img src="../../Assets/img/medios_de_pago.jpeg" style="max-height:140px;" alt="Pagos" loading="lazy" class="img-fluid rounded shadow-sm p-2">
        </div>
      </div>
      <hr class="mt-4 opacity-10">
      <div class="text-center small opacity-50">VIAJES LM-REPS &copy; 2024 Todos los derechos reservados.</div>
    </div>
  </footer>

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
      <p class="asesor-card-text">👋 ¡Hola! ¿Te ayudo a cotizar este viaje?</p>
      <a href="${waLink}" target="_blank" class="btn btn-success w-100"><i class="bi bi-whatsapp me-2"></i>Chatear por WhatsApp</a>
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
  <script src="/Assets/scripts/nav-destinos.js" defer></script>
  <script src="/Assets/scripts/pq-gallery.js" defer></script>
</body>

</html>
`;
}

// ── main ──
const args = process.argv.slice(2);
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.cjs'));
const slugs = args.length ? args : files.map((f) => f.replace('.cjs', ''));
for (const slug of slugs) {
  const d = require(path.join(DIR, slug + '.cjs'));
  const out = path.join(ROOT, 'Pages', 'paquetes', d.slug + '.html');
  fs.writeFileSync(out, build(d));
  console.log(`circuito: ${d.slug}.html generado`);
}
