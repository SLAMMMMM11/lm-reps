// Navbar transparente sobre el hero que se vuelve solido al hacer scroll.
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar-overlay');
  if (!navbar) return;

  const THRESHOLD = 80;

  function updateNavbar() {
    navbar.classList.toggle('navbar-scrolled', window.scrollY > THRESHOLD);
  }

  updateNavbar();
  window.addEventListener('scroll', updateNavbar, { passive: true });
});
