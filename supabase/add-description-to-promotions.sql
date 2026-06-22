-- Agrega descripcion corta a las promociones, para el nuevo formato de
-- tarjeta editorial (foto + titulo + descripcion + link) en vez de carrusel.

alter table public.promotions add column if not exists description text;

-- Backfill con un texto generico para las filas migradas del Sheet original
-- (no tenian descripcion). Editar desde el panel admin con texto real cuando
-- se pueda.
update public.promotions
set description = 'Conoce más sobre este destino y cotiza tu próximo viaje con nosotros.'
where description is null;
