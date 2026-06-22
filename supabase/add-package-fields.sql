-- Campos del PAQUETE en la tabla promotions, para que la dueña edite todo el
-- contenido de la página /paquete/{slug} desde el panel (antes vivía solo en
-- tools/paquetes-data.js, editable solo por un desarrollador).
--
-- `title`, `description`, `image_url`, `category` ya existen. Aquí agregamos:

alter table public.promotions add column if not exists slug text;        -- URL: /paquete/{slug}
alter table public.promotions add column if not exists subtitle text;    -- frase corta bajo el título
alter table public.promotions add column if not exists highlights text[]; -- "Lo que vivirás" (lista)
alter table public.promotions add column if not exists destino text;     -- país visible (filtro del catálogo)
alter table public.promotions add column if not exists pais text;        -- slug de la página de país (peru, japon...) o null
alter table public.promotions add column if not exists duration text;    -- ej. "13 días / 10 noches" (opcional)

-- El slug debe ser único entre los paquetes activos. Índice único parcial
-- (ignora filas sin slug, que no generan página).
create unique index if not exists promotions_slug_unique
  on public.promotions (slug) where slug is not null;
