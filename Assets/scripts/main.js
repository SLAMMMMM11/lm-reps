const SHEET_ID = '1YC0iXRY2IWEuizWdKLLzMS97uJUgkx9jEqVwB7TW1ao';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

async function loadTravelData() {
  try {
    const response = await fetch(SHEET_URL);
    const text = await response.text();

    // Este paso es más seguro para limpiar el texto de Google
    const jsonText = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/);
    if (!jsonText) throw new Error("No se pudo procesar el formato de Google Sheets");

    const data = JSON.parse(jsonText[1]);

    const travelData = {
      carouselhero: [],
      carouselpromos: [],
      carouselnorteamerica: [],
      carouselcentroamerica: [],
      carouselsudamerica: [],
      carouselasia: [],
      carouseleuropa: []
    };

    data.table.rows.forEach(row => {
      const catRaw = row.c[0] ? row.c[0].v : '';
      const cat = catRaw.toString().toLowerCase().trim();
      const img = row.c[1] ? row.c[1].v : '';
      const tit = row.c[2] ? row.c[2].v : 'Viaje';
      const btn = row.c[3] ? row.c[3].v : 'Saber Más';

      // CAPTURAMOS LA COLUMNA E (Índice 4) para el enlace
      const link = row.c[4] ? row.c[4].v : '#';

      if (travelData.hasOwnProperty(cat)) {
        travelData[cat].push({
          src: img,
          alt: tit,
          btnText: btn,
          url: link // Guardamos el enlace
        });
      }
    });

    // Dibujamos cada carrusel
    //renderHeroCarousel('heroCarousel', travelData.carouselhero);
    renderCarousels('carouselPromos', travelData.carouselpromos);
    renderCarousels('carouselNorteamerica', travelData.carouselnorteamerica);
    renderCarousels('carouselCentroamerica', travelData.carouselcentroamerica);
    renderCarousels('carouselSudamerica', travelData.carouselsudamerica);
    renderCarousels('carouselAsia', travelData.carouselasia);
    renderCarousels('carouselEuropa', travelData.carouseleuropa);

  } catch (error) {
    console.error("Error cargando datos:", error);
  }
}

function renderCarousels(carouselId, images) {
  const carouselElement = document.getElementById(carouselId);
  if (!carouselElement) return;

  // 1. Buscamos la etiqueta <section> que contiene a este carrusel
  const parentSection = carouselElement.closest('section');

  // 2. Si NO hay imágenes, nos aseguramos de que la sección siga oculta y salimos
  if (!images || images.length === 0) {
    // Opcional: Si quieres mostrar un mensaje de "No hay ofertas", podrías hacerlo aquí
    // pero para que se vea limpio, mejor lo dejamos oculto.
    return;
  }

  // 3. Lógica de renderizado (Tu código original)
  const inner = carouselElement.querySelector('.carousel-inner');
  const indicators = carouselElement.querySelector('.carousel-indicators');

  inner.innerHTML = '';
  if (indicators) indicators.innerHTML = '';

  for (let i = 0; i < images.length; i += 4) {
    const activeClass = i === 0 ? 'active' : '';
    const group = images.slice(i, i + 4);

    const itemsHtml = group.map(img => `
      <div class="col-6 col-md-3">
        <img src="${img.src}" class="img-fluid promo-img-container" 
             alt="${img.alt}" data-bs-toggle="modal" data-bs-target="#previewModal" 
             onclick="updatePreview(this.src)">
      </div>
    `).join('');

    inner.innerHTML += `
      <div class="carousel-item ${activeClass}">
        <div class="row g-3 justify-content-center">${itemsHtml}</div>
      </div>`;

    if (indicators) {
      indicators.innerHTML += `
        <button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${i / 4}" 
                class="${activeClass}" style="background-color: #ccc; width: 10px; height: 10px; border-radius: 50%; border:none; margin: 0 5px;"></button>`;
    }
  }

  // 4. MAGIA: Si llegamos aquí, es que hay imágenes cargadas. 
  // Mostramos la sección y le añadimos la animación.
  if (parentSection) {
    parentSection.classList.remove('hidden-section');
    parentSection.classList.add('fade-in-entry');
  }
}

function updatePreview(url) {
  const modalImg = document.getElementById('fullResImage');
  if (modalImg) modalImg.src = url;
}

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
      // Cambia el estado del botón al enviar
      contactBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';
      contactBtn.disabled = true;
    });
  }
});

function renderHeroCarousel(id, images) {
  const carousel = document.getElementById(id);
  if (!carousel) return;

  const inner = carousel.querySelector('.carousel-inner');
  const indicators = carousel.querySelector('.carousel-indicators');

  inner.innerHTML = '';
  if (indicators) indicators.innerHTML = '';

  if (!images || images.length === 0) return;

  images.forEach((img, index) => {
    const activeClass = index === 0 ? 'active' : '';

    // Viñetas
    if (indicators) {
      indicators.innerHTML += `
        <button type="button" data-bs-target="#${id}" data-bs-slide-to="${index}" 
                class="${activeClass}"></button>`;
    }

    // Slide con Título (permite <br>), Enlace Dinámico y Opacidad ajustada
    inner.innerHTML += `
      <div class="carousel-item ${activeClass}">
        <section class="hero-section" style="background-image: linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('${img.src}');">
          <div class="container hero-content">
            <h1 class="display-3">${img.alt}</h1>
            <a href="${img.url}" class="btn btn-danger btn-lg px-5 py-3 shadow border-0"
              style="background-color: var(--brand-primary);">${img.btnText}</a>
          </div>
        </section>
      </div>
    `;
  });
}