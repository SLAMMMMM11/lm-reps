-- Foto de perfil del cliente: columna en "profiles" + bucket publico "avatars".
-- A diferencia de "vouchers" (privado, un comprobante de pago es sensible),
-- una foto de perfil no lo es, asi que el bucket es publico (igual que
-- "promo-images") y se sirve con getPublicUrl() en vez de URLs firmadas.

alter table public.profiles add column if not exists avatar_url text;

-- ============================================================
-- Storage: bucket publico "avatars"
-- ============================================================
-- Crear manualmente en Storage -> New bucket -> nombre "avatars", Public = ON.
-- Cada usuario sube su foto dentro de su propia carpeta ({user_id}/...),
-- igual que en "vouchers" (ver schema.sql), pero aqui ademas puede
-- actualizar/borrar su propia foto para reemplazarla.

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert_own_folder" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own_folder" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own_folder" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
