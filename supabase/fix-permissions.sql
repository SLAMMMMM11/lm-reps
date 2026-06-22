-- Corrige el error 42501 "permission denied for table ...".
-- RLS solo filtra FILAS; sin estos GRANT, Postgres bloquea el acceso a la
-- tabla completa antes de evaluar las politicas RLS.
-- Pegar y correr en el SQL Editor.

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.credit_accounts to authenticated;
grant select, insert, update, delete on public.installments to authenticated;
grant select, insert, update, delete on public.vouchers to authenticated;
grant select, insert on public.audit_log to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.approve_voucher(uuid) to authenticated;
