-- 1) Elimina por completo la cuenta de desarrollo usada para bootstrapear
--    el primer admin (harold.lucky123456@gmail.com), incluyendo los datos
--    de prueba (cuentas de credito/vouchers) creados mientras se probaba
--    el sistema. Correr SOLO despues de haber promovido a super_admin la
--    cuenta de Outlook desde "Gestion de admins" -- si se corre antes,
--    nadie queda con super_admin.
-- 2) Tambien limpia la cuenta de credito de prueba ("test", S/ 15,700)
--    que quedo asociada a la cuenta de Outlook mientras se probaba el
--    flujo de creditos/vouchers -- un super admin no usa el panel de
--    cliente, asi que no debe quedar con esa cuenta de credito huerfana.

do $$
declare
  gmail_id uuid;
  outlook_id uuid;
begin
  select id into gmail_id from public.profiles where email = 'harold.lucky123456@gmail.com';
  select id into outlook_id from public.profiles where email = 'haroldsalazarm@outlook.com.pe';

  -- ---------- Parte 1: borrar la cuenta de Gmail ----------
  if gmail_id is null then
    raise notice 'No existe ningun perfil con harold.lucky123456@gmail.com, nada que borrar ahi.';
  else
    update public.vouchers set reviewed_by = null where reviewed_by = gmail_id;
    update public.audit_log set actor_id = null where actor_id = gmail_id;
    update public.credit_accounts set created_by = null where created_by = gmail_id;
    update public.installments set updated_by = null where updated_by = gmail_id;
    update public.promotions set created_by = null where created_by = gmail_id;

    -- Cascada: credit_accounts -> installments -> vouchers (on delete cascade).
    delete from public.credit_accounts where customer_id = gmail_id;
    delete from public.vouchers where customer_id = gmail_id;

    -- Cascada a public.profiles (on delete cascade).
    delete from auth.users where id = gmail_id;

    raise notice 'Cuenta de Gmail (%) eliminada correctamente.', gmail_id;
  end if;

  -- ---------- Parte 2: limpiar cuenta de credito de prueba en Outlook ----------
  if outlook_id is null then
    raise notice 'No existe ningun perfil con haroldsalazarm@outlook.com.pe, nada que limpiar ahi.';
  else
    update public.vouchers set reviewed_by = null where reviewed_by = outlook_id;
    update public.audit_log set actor_id = null where actor_id = outlook_id;
    update public.credit_accounts set created_by = null where created_by = outlook_id;
    update public.installments set updated_by = null where updated_by = outlook_id;
    update public.promotions set created_by = null where created_by = outlook_id;

    delete from public.credit_accounts where customer_id = outlook_id;
    delete from public.vouchers where customer_id = outlook_id;

    raise notice 'Cuenta(s) de credito de prueba de Outlook (%) eliminadas.', outlook_id;
  end if;
end $$;

-- Verificacion: la primera debe devolver 0 filas; la segunda, 0 cuentas de credito.
select * from public.profiles where email = 'harold.lucky123456@gmail.com';
select * from public.credit_accounts where customer_id = (select id from public.profiles where email = 'haroldsalazarm@outlook.com.pe');
