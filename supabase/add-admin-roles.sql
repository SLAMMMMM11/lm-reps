-- Tres niveles de admin:
--   super_admin: acceso total + gestiona otros admins (el developer).
--   admin: acceso total excepto gestionar otros admins (la dueña del negocio).
--   asesor: solo clientes/leads/vouchers/cuotas (ventas).
-- is_admin sigue siendo el booleano "es staff" que ya usan ~9 policies
-- existentes (sin tocar esas); admin_role distingue el tier solo donde
-- el asesor debe quedar afuera (auditoria, promociones) y donde solo el
-- super_admin debe poder operar (gestion de admins).

alter table public.profiles add column if not exists admin_role text
  check (admin_role in ('asesor', 'admin', 'super_admin'));

-- Backfill: los admins actuales conservan acceso total.
update public.profiles set admin_role = 'super_admin'
where is_admin = true and admin_role is null;

-- ============================================================
-- is_full_admin(): admin o super_admin (todo menos gestionar admins).
-- is_super_admin(): solo super_admin (gestiona admins, no puede ser
-- saltado por nadie mas, ni siquiera por "admin").
-- ============================================================

create function public.is_full_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin and admin_role in ('admin', 'super_admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

create function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin and admin_role = 'super_admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_full_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;

-- ============================================================
-- Trigger: solo super_admin puede cambiar is_admin/admin_role de
-- cualquier fila (ni un "admin" puede promoverse o promover a otros).
-- ============================================================

create or replace function public.prevent_self_admin_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.is_admin is distinct from old.is_admin or new.admin_role is distinct from old.admin_role)
     and not exists (
       select 1 from public.profiles where id = auth.uid() and is_admin = true and admin_role = 'super_admin'
     ) then
    new.is_admin := old.is_admin;
    new.admin_role := old.admin_role;
  end if;
  return new;
end;
$$;

-- ============================================================
-- Auditoria: asesor sigue pudiendo INSERTAR (loguea sus propias
-- acciones), pero solo admin/super_admin pueden ver el historial (SELECT).
-- ============================================================

drop policy if exists "audit_log_select_admin_only" on public.audit_log;
create policy "audit_log_select_admin_only" on public.audit_log
  for select using (public.is_full_admin());

-- ============================================================
-- Promociones del home: admin y super_admin las crean/editan/borran.
-- ============================================================

drop policy if exists "promotions_write_admin_only" on public.promotions;
create policy "promotions_write_admin_only" on public.promotions
  for all using (public.is_full_admin()) with check (public.is_full_admin());

drop policy if exists "promo_images_admin_insert" on storage.objects;
create policy "promo_images_admin_insert" on storage.objects
  for insert with check (bucket_id = 'promo-images' and public.is_full_admin());

drop policy if exists "promo_images_admin_update" on storage.objects;
create policy "promo_images_admin_update" on storage.objects
  for update using (bucket_id = 'promo-images' and public.is_full_admin())
  with check (bucket_id = 'promo-images' and public.is_full_admin());

drop policy if exists "promo_images_admin_delete" on storage.objects;
create policy "promo_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'promo-images' and public.is_full_admin());
