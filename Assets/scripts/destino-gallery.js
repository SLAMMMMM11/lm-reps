/* destino-gallery.js — subnav luxury fixed + tracking + gallery */
(function () {

  /* ── 0. SUBNAV FIXED + VISIBILIDAD ────────────────────────────
     position:fixed elimina el gap con el navbar.
     Aparece con fade+slide cuando el hero sale del viewport.
  ─────────────────────────────────────────────────────────────── */
  (function initSubnav() {
    const navbar = document.querySelector('.navbar-overlay');
    const subnav = document.getElementById('dtSubnav');
    const hero   = document.querySelector('.dt-hero');
    if (!navbar || !subnav) return;

    const SECTION_IDS = ['resumen', 'destacados', 'galeria', 'mas-info', 'itinerarios'];

    function syncTop() {
      const navH   = Math.ceil(navbar.getBoundingClientRect().height);
      subnav.style.top = navH + 'px';
      /* scroll-margin-top = navbar + subnav + pequeño respiro */
      const total = navH + subnav.offsetHeight + 6;
      SECTION_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.scrollMarginTop = total + 'px';
      });
    }

    /* Mostrar/ocultar subnav según el hero está en viewport */
    if (hero) {
      new IntersectionObserver(([e]) => {
        subnav.classList.toggle('dt-subnav--visible', !e.isIntersecting);
      }, { threshold: 0 }).observe(hero);
    } else {
      /* Sin hero: siempre visible */
      subnav.classList.add('dt-subnav--visible');
    }

    /* Re-sincronizar top cuando el navbar cambia de estado (umbral 80px) */
    let wasScrolled = null;
    window.addEventListener('scroll', () => {
      const isScrolled = window.scrollY > 80;
      if (isScrolled !== wasScrolled) {
        wasScrolled = isScrolled;
        requestAnimationFrame(syncTop);
      }
    }, { passive: true });

    syncTop();
    window.addEventListener('load',   syncTop);
    window.addEventListener('resize', syncTop, { passive: true });
  })();

  /* ── 1. SUBNAV ACTIVE STATE (IntersectionObserver) ────────────
     Detecta qué sección entra en la zona activa debajo de las dos
     barras (~120px desde el top) y marca el tab correcto.
  ─────────────────────────────────────────────────────────────── */
  (function initSectionSpy() {
    const links = document.querySelectorAll('#dtSubnav .nav-link');
    if (!links.length) return;

    const sections = Array.from(links)
      .map(l => document.getElementById(l.getAttribute('href').replace('#', '')))
      .filter(Boolean);

    const setActive = id => {
      links.forEach(l =>
        l.classList.toggle('active', l.getAttribute('href') === '#' + id)
      );
    };

    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length) setActive(visible[0].target.id);
    }, { rootMargin: '-120px 0px -45% 0px', threshold: 0 });

    sections.forEach(s => io.observe(s));
  })();

  /* ── 2. GALLERY ARROWS + DRAG ─────────────────────────────── */
  const wrap = document.getElementById('dtGallery');
  if (!wrap) return;

  const prev = document.getElementById('dtGalleryPrev');
  const next = document.getElementById('dtGalleryNext');

  function itemStep() {
    const item = wrap.querySelector('.dt-gallery-item');
    return item ? item.offsetWidth + 10 : 320;
  }

  if (prev) prev.addEventListener('click', () => wrap.scrollBy({ left: -itemStep(), behavior: 'smooth' }));
  if (next) next.addEventListener('click', () => wrap.scrollBy({ left:  itemStep(), behavior: 'smooth' }));

  function updateArrows() {
    if (!prev || !next) return;
    const atStart = wrap.scrollLeft <= 1;
    const atEnd   = wrap.scrollLeft >= wrap.scrollWidth - wrap.clientWidth - 1;
    prev.disabled      = atStart;
    next.disabled      = atEnd;
    prev.style.opacity = atStart ? '0.3' : '1';
    next.style.opacity = atEnd   ? '0.3' : '1';
  }

  wrap.addEventListener('scroll', updateArrows, { passive: true });
  setTimeout(updateArrows, 120);

  /* Drag-to-scroll */
  const THRESHOLD = 8;
  let isDown = false, startX = 0, startScroll = 0, didDrag = false;

  wrap.addEventListener('mousedown', e => {
    isDown      = true;
    didDrag     = false;
    startX      = e.clientX;
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

  window.addEventListener('mousemove', e => {
    if (!isDown) return;
    const dx = startX - e.clientX;
    if (!didDrag && Math.abs(dx) < THRESHOLD) return;
    didDrag = true;
    e.preventDefault();
    wrap.classList.add('dragging');
    wrap.scrollLeft = startScroll + dx;
  });

  wrap.addEventListener('click', e => {
    if (didDrag) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  wrap.querySelectorAll('img').forEach(img => img.setAttribute('draggable', 'false'));

})();
