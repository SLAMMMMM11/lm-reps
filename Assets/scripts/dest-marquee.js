// Cinta "Destinos destacados" del home: auto-avance + arrastre.
// El markup trae las tarjetas DUPLICADAS (herencia del marquee CSS), así que
// el scroll se reposiciona al cruzar la mitad y el desplazamiento es
// infinito en ambos sentidos. Sin JS, la cinta conserva el marquee CSS.
(function () {
  const marquee = document.querySelector('.dest-marquee');
  const track = marquee && marquee.querySelector('.dest-track');
  if (!marquee || !track) return;

  marquee.classList.add('dest-marquee--drag');

  const SPEED = 35; // px/s ≈ ritmo del marquee original (50% en 90s)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = reduced;
  let resumeTimer = null;
  let last = performance.now();
  let isDown = false, startX = 0, startScroll = 0, didDrag = false;

  const half = () => track.scrollWidth / 2;

  // Reposiciona el scroll al cruzar la copia duplicada (loop infinito).
  // Si ocurre en medio de un drag, corrige también el punto de partida.
  function wrap() {
    const h = half();
    if (!h) return;
    if (marquee.scrollLeft >= h) {
      marquee.scrollLeft -= h;
      if (isDown) startScroll -= h;
    } else if (marquee.scrollLeft < 1) {
      marquee.scrollLeft += h;
      if (isDown) startScroll += h;
    }
  }

  // Posición acumulada en float: sumar ~0.6px por frame directamente a
  // scrollLeft se pierde por redondeo y la cinta avanzaría a paso de tortuga.
  let pos = 0;

  function tick(now) {
    const dt = (now - last) / 1000;
    last = now;
    if (!paused && dt < 0.5) {
      // resincronizar si el usuario movió la cinta (drag/touch/rueda)
      if (Math.abs(pos - marquee.scrollLeft) > 1.5) pos = marquee.scrollLeft;
      pos += SPEED * dt;
      const h = half();
      if (h && pos >= h) pos -= h;
      marquee.scrollLeft = pos;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function pause() {
    paused = true;
    if (resumeTimer) clearTimeout(resumeTimer);
  }
  function scheduleResume() {
    if (reduced) return;
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { paused = false; last = performance.now(); }, 3500);
  }

  // Táctil (scroll nativo) y rueda: pausar mientras se usa
  marquee.addEventListener('touchstart', pause, { passive: true });
  marquee.addEventListener('touchend', scheduleResume, { passive: true });
  marquee.addEventListener('wheel', () => { pause(); scheduleResume(); }, { passive: true });
  marquee.addEventListener('scroll', wrap, { passive: true });

  // Hover pausa (comportamiento que ya tenía el marquee)
  marquee.addEventListener('mouseenter', pause);
  marquee.addEventListener('mouseleave', scheduleResume);

  // Drag con mouse (mismo patrón que destino-gallery.js)
  const THRESHOLD = 8;
  marquee.addEventListener('mousedown', (e) => {
    isDown = true;
    didDrag = false;
    startX = e.clientX;
    startScroll = marquee.scrollLeft;
    marquee.style.userSelect = 'none';
    pause();
  });
  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    marquee.classList.remove('dragging');
    marquee.style.userSelect = '';
    scheduleResume();
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const dx = startX - e.clientX;
    if (!didDrag && Math.abs(dx) < THRESHOLD) return;
    didDrag = true;
    e.preventDefault();
    marquee.classList.add('dragging');
    marquee.scrollLeft = startScroll + dx;
  });
  // Un drag no debe disparar el enlace de la tarjeta
  marquee.addEventListener('click', (e) => {
    if (didDrag) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  marquee.querySelectorAll('img').forEach((img) => img.setAttribute('draggable', 'false'));
})();
