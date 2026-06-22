// Widget flotante de asesora: el avatar abre/cierra una tarjeta con el CTA de
// WhatsApp. En desktop también se abre al pasar el mouse (vía CSS :hover).
(function () {
  const fab = document.getElementById('asesorFab');
  if (!fab) return;
  const toggle = fab.querySelector('.asesor-toggle');
  const closeBtn = fab.querySelector('.asesor-card-close');

  if (toggle) toggle.addEventListener('click', (e) => { e.stopPropagation(); fab.classList.toggle('open'); });
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); fab.classList.remove('open'); });
  document.addEventListener('click', (e) => { if (!fab.contains(e.target)) fab.classList.remove('open'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fab.classList.remove('open'); });
})();
