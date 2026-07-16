// Cinta de galería de las páginas de paquete (flechas + drag-to-scroll).
// Mismo patrón que la galería de destinos (destino-gallery.js).
(function () {
  const wrap = document.getElementById('pqGallery');
  if (!wrap) return;

  const prev = document.getElementById('pqGalleryPrev');
  const next = document.getElementById('pqGalleryNext');

  function itemStep() {
    const item = wrap.querySelector('.pq-gallery-item');
    return item ? item.offsetWidth + 10 : 320;
  }

  if (prev) prev.addEventListener('click', () => wrap.scrollBy({ left: -itemStep(), behavior: 'smooth' }));
  if (next) next.addEventListener('click', () => wrap.scrollBy({ left: itemStep(), behavior: 'smooth' }));

  function updateArrows() {
    if (!prev || !next) return;
    const atStart = wrap.scrollLeft <= 1;
    const atEnd = wrap.scrollLeft >= wrap.scrollWidth - wrap.clientWidth - 1;
    prev.disabled = atStart;
    next.disabled = atEnd;
    prev.style.opacity = atStart ? '0.3' : '1';
    next.style.opacity = atEnd ? '0.3' : '1';
  }

  wrap.addEventListener('scroll', updateArrows, { passive: true });
  setTimeout(updateArrows, 120);

  const THRESHOLD = 8;
  let isDown = false, startX = 0, startScroll = 0, didDrag = false;

  wrap.addEventListener('mousedown', (e) => {
    isDown = true;
    didDrag = false;
    startX = e.clientX;
    startScroll = wrap.scrollLeft;
    wrap.style.userSelect = 'none';
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    wrap.classList.remove('dragging');
    wrap.style.userSelect = '';
    updateArrows();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const dx = startX - e.clientX;
    if (!didDrag && Math.abs(dx) < THRESHOLD) return;
    didDrag = true;
    e.preventDefault();
    wrap.classList.add('dragging');
    wrap.scrollLeft = startScroll + dx;
  });

  wrap.addEventListener('click', (e) => {
    if (didDrag) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  wrap.querySelectorAll('img').forEach((img) => img.setAttribute('draggable', 'false'));
})();
