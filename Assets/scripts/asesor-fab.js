// Widget flotante de asesora: el avatar abre/cierra una tarjeta con el CTA de
// WhatsApp. En desktop también se abre al pasar el mouse (vía CSS :hover).
(function () {
  const fab = document.getElementById('asesorFab');
  if (!fab) return;
  const toggle = fab.querySelector('.asesor-toggle');
  const closeBtn = fab.querySelector('.asesor-card-close');
  let suppressHoverOpen = false;

  const close = () => fab.classList.remove('open');

  if (toggle) toggle.addEventListener('click', (e) => { e.stopPropagation(); fab.classList.toggle('open'); });
  if (closeBtn) closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
    suppressHoverOpen = true; // evita que el mouse, aun encima, la vuelva a abrir
  });

  // Hover solo en dispositivos con mouse real: en touch, los eventos
  // mouseenter/mousedown sinteticos que disparan los navegadores tras un tap
  // pelean con el click del toggle y dejan la tarjeta cerrada de inmediato.
  if (window.matchMedia('(hover: hover)').matches) {
    fab.addEventListener('mouseenter', () => { if (!suppressHoverOpen) fab.classList.add('open'); });
    fab.addEventListener('mouseleave', () => { suppressHoverOpen = false; close(); });
  }

  document.addEventListener('click', (e) => { if (!fab.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
