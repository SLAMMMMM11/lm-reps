# Páginas de país (`/destinos/{pais}`) — estándar de la sección "Imágenes del destino"

Las páginas de país (`Pages/destinos/*.html`) se escriben a mano (no hay
generador, a diferencia de `tools/gen-paquetes.cjs` / `gen-circuito.cjs`).
Al crear un país nuevo, copiar la estructura de una página existente
(`espana.html` es la más completa) y seguir este estándar en la sección
`id="galeria"`.

## La sección debe ser SIEMPRE una cinta arrastrable, nunca una grilla estática

Markup: `dt-gallery-outer` > botones `dt-gallery-nav` (prev/next) +
`dt-gallery-wrap` > `dt-gallery-track` > `figure.dt-gallery-item` (img +
`figcaption.dt-gallery-caption`). Estilos en `Assets/css/destino.css`
(`.dt-gallery-*`, ya comparten los 10 países — no crear CSS nuevo).
Script: `Assets/scripts/destino-gallery.js` (drag con umbral de 8px +
supresión de click, flechas prev/next, se registra solo, no requiere config
por página). Encabezado fijo: eyebrow "Imágenes del destino" + `<h2>`
"Paisajes de {País}".

## Contenido: mínimo 7 fotos, cubriendo variedad real del país

No basta con fotos de una sola ciudad. Cada país debe combinar, cuando el
destino lo permita:
- **Naturaleza / paisaje** (montaña, glaciar, desierto, selva) — ej. Fitz Roy
  y Perito Moreno en Argentina, Monte Fuji en Japón, Montaña de 7 Colores en
  Perú.
- **Costa / playa** — ej. Costa del Sol (España), Costa Verde (Perú), Islas
  del sur (Tailandia), Cancún (México).
- **Ciudad / arquitectura icónica** — plazas, monumentos, skyline.
- **Cultura / detalle** (opcional) — mercados, festividades, gastronomía.

## Regla dura de todo el proyecto: NUNCA una imagen sin verla primero

Antes de agregar cualquier foto nueva (Unsplash, Wikimedia o cualquier
fuente), descargarla y verla — nunca confiar en el nombre del archivo o el ID.
Ver `tools/img-bank.json` (banco de imágenes ya verificadas visualmente por
país, reutilizable). Orden de fuentes preferido:
1. `/Assets/img/{pais}/*.jpg` (hero.jpg, 1.jpg, 2.jpg, 3.jpg — ya subidas y
   verificadas).
2. Wikimedia Commons vía API REST (`/api/rest_v1/page/summary/{title}`,
   thumb de 1280px, hotlink a `upload.wikimedia.org`) — la fuente más
   confiable para monumentos/lugares específicos.
3. Unsplash, **solo tras verla en una hoja de contactos** — nunca adivinar un
   ID.

## Auditoría 2026-07-18: las 10 páginas YA cumplen el estándar

Se revisaron visualmente (Chrome headless, capturas 1400×900) las 10 páginas
de país existentes. Todas tienen la cinta arrastrable con 7-10 fotos
verificadas y variedad real (costa: Costa del Sol/Calas del Mediterráneo en
España, Patagonia/Costa Verde en Argentina/Perú, islas y playas en
Tailandia/Emiratos/México; montaña/naturaleza: Fitz Roy, Monte Fuji, Gran
Cañón, Montaña de 7 Colores, Cinque Terre; ciudad/cultura: el resto). No hizo
falta ninguna corrección de contenido — el estándar de este documento ya
estaba cumplido en los países creados hasta ahora. Solo se corrigió un bug
no relacionado (meta description rota en `paquete/espana-y-portugal.html`
que insertaba texto suelto visible al inicio de esa página).

**Gotcha de verificación (para la próxima auditoría headless):** las
primeras 2 capturas de EE. UU. y Emiratos Árabes mostraron imágenes en
blanco en la 2ª-3ª posición de la cinta. Parecía un archivo roto, pero era
una carrera con `loading="lazy"`: un `waitUntil: 'networkidle2'` + ~350ms
tras el scroll no le da tiempo al navegador a descargar+decodificar la foto
sobre una red real. Se confirmó con `curl` (200 OK, tamaño correcto) y
forzando `img.onload`/`naturalWidth` en el propio navegador. **Al auditar
capturas de esta cinta, esperar a que `naturalWidth > 0` en las imágenes
visibles antes de tomar la screenshot, no solo un timeout fijo corto.**

## Al agregar un país nuevo

1. Reunir 8-12 candidatas por categoría (naturaleza, costa, ciudad, cultura).
2. Verificarlas TODAS visualmente antes de escribir el HTML.
3. Copiar el markup `dt-gallery-*` de `espana.html` (no reinventar CSS/JS).
4. Actualizar `PAIS_OPTIONS` en `Assets/scripts/nav-destinos.js` si el país es
   nuevo en el menú Destinos.
5. Auditar con Chrome headless a 1400×900 (desktop) y 390×844 (móvil) antes
   de dar por terminada la página — ver `docs/plan-circuitos.md` para el
   patrón de verificación headless usado en el resto del proyecto.
