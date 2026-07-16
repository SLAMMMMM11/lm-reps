// Paquetes con página hecha a mano (no nacen de un flyer del panel).
// El generador los suma al manifiesto/catálogo/sitemap pero NUNCA sobrescribe
// su HTML en Pages/paquetes/. Para agregar otro: crear la página a mano y
// registrar aquí su entrada.
module.exports = [
  {
    slug: 'colores-de-espana',
    title: 'Colores de España',
    subtitle: 'Madrid, Andalucía y Costa del Sol — salidas los sábados.',
    image: '/Assets/img/espana/espana-madrid.jpg',
    duration: '9 o 10 días',
    regionKey: 'carouseleuropa',
    destino: 'España',
    countries: ['espana'],
  },
];
