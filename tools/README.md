# tools — Generador de páginas de paquete

Genera una página estática por cada paquete (`/paquete/{slug}`). **La fuente de
verdad es la tabla `promotions` de Supabase** (lo que la dueña edita en el panel);
`paquetes-data.js` queda solo como semilla/respaldo.

## Cómo la dueña gestiona los paquetes (autoservicio)
1. Entra al panel admin → pestaña **Paquetes**.
2. Agrega/edita un paquete: sube el afiche (con vista previa), pone título,
   descripción corta, "Lo que vivirás" (un punto por línea), región, destino,
   página de país y duración. Se guarda al instante en la base.
3. Toca **"Publicar cambios"** → dispara un rebuild de Netlify (`/api/publish` →
   función `publish.mjs` → Build Hook) y el sitio se actualiza en ~1-2 minutos.

## Configuración inicial (una sola vez)
Correr en el SQL editor de Supabase, en orden:
1. `supabase/add-leads-table.sql` — tabla de solicitudes.
2. `supabase/add-package-fields.sql` — columnas slug/subtitle/highlights/destino/pais/duration.
3. `supabase/backfill-package-content.sql` — carga el contenido inicial de los 52 paquetes.

En Netlify:
- Crear un **Build hook** (Site settings → Build & deploy → Build hooks).
- Poner su URL en la variable de entorno **`BUILD_HOOK_URL`** (Site settings →
  Environment variables). La función `publish.mjs` la lee de ahí (no se expone).

## Archivos
- **`gen-paquetes.cjs`** — el generador. Lee `promotions` en vivo (campos del
  paquete) y produce `Pages/paquetes/{slug}.html`, `Assets/data/paquetes.json`
  (manifiesto) y actualiza `sitemap.xml`. Corre en cada deploy (ver
  `netlify.toml → [build] command`). Si las columnas nuevas aún no existen, cae al
  respaldo `paquetes-data.js` para no romper el build.
- **`paquetes-data.js`** — semilla/respaldo del contenido (indexado por nombre de
  archivo del flyer). Ya no es la fuente de verdad.
- **`_gen-backfill.cjs`** (temporal) — generó `backfill-package-content.sql` desde
  la semilla. Re-correr solo si se quiere re-sembrar.

## Regenerar manualmente (opcional, para probar local)
```bash
node tools/gen-paquetes.cjs
```

## Notas
- El home y las páginas de país enlazan a los paquetes vía el manifiesto
  (`Assets/scripts/main.js` y `Assets/scripts/destino-paquetes.js`).
- El ruteo limpio `/paquete/*` está en `_redirects`.
- Los archivos `tools/_*` son temporales/caché (ignorados por git).

## Solicitudes / leads (Supabase)
Los formularios (modal de paquete y página Contáctanos) guardan cada solicitud en
la tabla **`leads` de Supabase** y además abren WhatsApp con toda la data. Módulos:
`Assets/scripts/leads.js` (compartido), `solicitud.js` (modal de paquete) y
`contacto-form.js` (Contáctanos). Se ven en el panel admin → pestaña **Solicitudes**
(`Assets/scripts/admin-leads.js`).

⚠️ **Requiere correr una vez** `supabase/add-leads-table.sql` en el SQL editor de
Supabase. Hasta entonces, los formularios igual abren WhatsApp (la inserción falla
en silencio con un aviso de respaldo). Email de aviso (Resend) = follow-up opcional.

## Páginas y rutas relacionadas
- `/paquetes` → `Pages/paquetes.html` (catálogo filtrable, usa `catalogo.js` + manifiesto).
- `/informacion-de-viaje` → `Pages/tramites.html` (alias).
- Widget de asesora: `Assets/scripts/asesor-fab.js` + estilos `.asesor-*` (usa `Assets/img/call-center.webp`).
