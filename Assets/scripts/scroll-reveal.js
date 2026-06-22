// Animacion simple de aparicion al hacer scroll (fade + slide), sin libreria
// externa. Inspirado en el efecto visual de travelstore.com, recreado con
// IntersectionObserver vanilla.
document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.country-feature');
  if (items.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  items.forEach((el) => observer.observe(el));
});
