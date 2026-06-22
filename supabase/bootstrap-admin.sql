-- Bootstrap del primer admin. El trigger "before_profile_update" bloquea
-- cambios de is_admin cuando no hay un usuario autenticado en contexto
-- (como ocurre al editar desde el Table Editor) -- lo desactivamos
-- momentaneamente solo para este UPDATE inicial.

alter table public.profiles disable trigger before_profile_update;

update public.profiles
set is_admin = true
where email = 'harold.lucky123456@gmail.com';

alter table public.profiles enable trigger before_profile_update;
