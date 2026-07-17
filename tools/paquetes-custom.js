// Paquetes con página propia (no nacen de un flyer del panel). El generador
// de paquetes los suma al manifiesto/catálogo/sitemap pero NUNCA sobrescribe
// su HTML en Pages/paquetes/. Dos orígenes:
//   1. MANUALES: páginas escritas a mano, registradas abajo.
//   2. CIRCUITOS: datos en tools/circuitos/{slug}.cjs (HTML producido por
//      tools/gen-circuito.cjs) — se auto-registran, no tocar esta lista.
const fs = require('fs');
const path = require('path');

const circuitos = fs.readdirSync(path.join(__dirname, 'circuitos'))
  .filter((f) => f.endsWith('.cjs'))
  .map((f) => {
    const d = require(path.join(__dirname, 'circuitos', f));
    return {
      slug: d.slug,
      title: d.title,
      subtitle: d.subtitle,
      image: d.card || d.hero,
      duration: d.dias,
      regionKey: d.region,
      destino: d.destino,
      countries: d.countries,
    };
  });

module.exports = circuitos.concat([
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
  {
    slug: 'espana-encantadora',
    title: 'España Encantadora',
    subtitle: 'Madrid, Andalucía, Valencia y Barcelona — salidas los sábados.',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=800',
    duration: '10 u 11 días',
    regionKey: 'carouseleuropa',
    destino: 'España',
    countries: ['espana'],
  },
  {
    slug: 'espana-y-portugal',
    title: 'España y Portugal',
    subtitle: 'Madrid, Salamanca, Santiago, Oporto, Lisboa, Andalucía, Valencia y Barcelona — salidas los domingos.',
    image: 'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?q=80&w=800',
    duration: '16 o 17 días',
    regionKey: 'carouseleuropa',
    destino: 'España y Portugal',
    countries: ['espana'],
  },
]);
