-- Tabla de promociones/destinos para el home, reemplaza el Google Sheet.
-- A diferencia de TODAS las tablas anteriores (profiles, credit_accounts, etc.),
-- esta tabla debe ser legible por visitantes SIN sesion (rol "anon"), porque
-- el home publico no requiere login. Por eso se otorgan permisos a "anon"
-- ademas de "authenticated".

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'carouselpromos', 'carouselnorteamerica', 'carouselcentroamerica',
    'carouselsudamerica', 'carouselasia', 'carouseleuropa'
  )),
  title text not null,
  image_url text not null,
  button_text text not null default 'Saber Más',
  link_url text not null default '#',
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

alter table public.promotions enable row level security;

-- Lectura publica: cualquiera (incluso sin sesion) ve las promociones activas.
-- El admin tambien ve las inactivas (para poder reactivarlas desde el panel).
create policy "promotions_select_public" on public.promotions
  for select using (is_active = true or public.is_admin());

-- Escritura solo admin. Sin is_admin_mfa(): esto es contenido de marketing,
-- no datos financieros, no amerita exigir el segundo factor.
create policy "promotions_write_admin_only" on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

-- GRANTS: igual que con las demas tablas, sin esto Postgres rechaza el
-- acceso antes de evaluar RLS (error 42501). La diferencia clave aqui es
-- el grant a "anon", que ninguna otra tabla del proyecto tiene.
grant usage on schema public to anon;
grant select on public.promotions to anon;
grant select, insert, update, delete on public.promotions to authenticated;

-- ============================================================
-- Storage: bucket publico "promo-images"
-- ============================================================
-- Crear manualmente en Storage -> New bucket -> nombre "promo-images",
-- Public = ON (a diferencia del bucket privado "vouchers").
-- Luego correr estas politicas:

create policy "promo_images_public_read" on storage.objects
  for select using (bucket_id = 'promo-images');

create policy "promo_images_admin_insert" on storage.objects
  for insert with check (bucket_id = 'promo-images' and public.is_admin());

create policy "promo_images_admin_update" on storage.objects
  for update using (bucket_id = 'promo-images' and public.is_admin())
  with check (bucket_id = 'promo-images' and public.is_admin());

create policy "promo_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'promo-images' and public.is_admin());
