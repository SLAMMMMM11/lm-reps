# Viajes LM-Reps

Sitio web oficial de **Viajes LM-Reps**, agencia de viajes en Perú: [lm-reps.com](https://lm-reps.com).

Sitio estático (sin bundler) desplegado en Netlify, con autenticación, panel administrativo y leads gestionados a través de Supabase.

## Stack

- **Frontend**: HTML, CSS y JavaScript vanilla (módulos ES), [Bootstrap 5](https://getbootstrap.com/) y [Bootstrap Icons](https://icons.getbootstrap.com/).
- **Backend**: [Supabase](https://supabase.com/) (Postgres, Auth, Storage, Row Level Security).
- **Hosting / Functions**: [Netlify](https://www.netlify.com/) (sitio estático + Netlify Functions en `netlify/functions/`).

## Estructura

```
Assets/         CSS, JS, imágenes y datos generados (Assets/data/)
Pages/          Páginas del sitio: cuenta de cliente, panel admin, destinos, paquetes individuales, etc.
netlify/        Netlify Functions (ej. publicar cambios, proxy de sugerencias)
supabase/       Migraciones SQL del esquema, RLS y datos semilla
tools/          Generador estático de páginas de paquete (gen-paquetes.cjs)
```

## Desarrollo local

Requiere [Netlify CLI](https://docs.netlify.com/cli/get-started/) (no usar `serve`/`http-server`, ya que no aplican las reglas de `_redirects`):

```bash
npx netlify-cli dev --port 5500
```

El sitio queda disponible en `http://localhost:5500/`.

## Base de datos (Supabase)

Las migraciones en `supabase/*.sql` **no se aplican automáticamente**. Se ejecutan manualmente, en orden, desde el SQL Editor del proyecto en Supabase.

## Build / Deploy

El build de Netlify corre `node tools/gen-paquetes.cjs`, que regenera las páginas estáticas de paquete (`Pages/paquetes/`) a partir de los datos en Supabase antes de publicar. El deploy se dispara automáticamente con cada push a `main`, o manualmente desde el panel admin (botón "Publicar cambios", vía Build Hook de Netlify).
