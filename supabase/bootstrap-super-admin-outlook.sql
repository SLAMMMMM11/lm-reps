-- Recuperacion: tras borrar la cuenta de Gmail no quedo ningun super_admin.
-- Bootstrapea manualmente la cuenta de Outlook, igual que se hizo
-- originalmente con bootstrap-admin.sql para Gmail.

alter table public.profiles disable trigger before_profile_update;
update public.profiles set is_admin = true, admin_role = 'super_admin'
where email = 'haroldsalazarm@outlook.com.pe';
alter table public.profiles enable trigger before_profile_update;

-- Verificacion: debe devolver 1 fila con is_admin = true, admin_role = 'super_admin'.
select id, full_name, email, is_admin, admin_role
from public.profiles where email = 'haroldsalazarm@outlook.com.pe';
