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
      carouselpromos: [],
      carouselnorteamerica: [],
      carouselcentroamerica: [],
      carouselsudamerica: [],
      carouselasia: [],
      carouseleuropa: []
    };

    data.table.rows.forEach(row => {
      // Obtenemos los valores de las columnas A, B y C de forma segura
      const catRaw = row.c[0] ? row.c[0].v : '';
      const cat = catRaw.toString().toLowerCase().trim();
      const img = row.c[1] ? row.c[1].v : '';
      const tit = row.c[2] ? row.c[2].v : 'Viaje';

      if (travelData.hasOwnProperty(cat)) {
        travelData[cat].push({ src: img, alt: tit });
      }
    });

    // Dibujamos cada carrusel
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

function renderCarousels(id, images) {
  const carousel = document.getElementById(id);
  if (!carousel) return;

  const inner = carousel.querySelector('.carousel-inner');
  const indicators = carousel.querySelector('.carousel-indicators');
  
  inner.innerHTML = '';
  if (indicators) indicators.innerHTML = '';

  if (!images || images.length === 0) {
    inner.innerHTML = '<p class="text-center text-muted p-5">Próximamente nuevas ofertas...</p>';
    return;
  }

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
        <button type="button" data-bs-target="#${id}" data-bs-slide-to="${i / 4}" 
                class="${activeClass}" style="background-color: #ccc; width: 10px; height: 10px; border-radius: 50%; border:none; margin: 0 5px;"></button>`;
    }
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
