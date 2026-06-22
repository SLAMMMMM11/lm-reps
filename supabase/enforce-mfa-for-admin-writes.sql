-- Exige verificacion en 2 pasos (aal2) para las ESCRITURAS de admin,
-- no solo para el login visual. Sin esto, alguien que se salte el paso
-- del codigo en el login seguiria teniendo una sesion con permisos
-- completos de admin (RLS es el limite de seguridad real, no el login).
--
-- Las LECTURAS no se restringen (no hay problema en que el admin entre
-- sin el segundo factor a revisar datos), solo INSERT/UPDATE/DELETE.

create or replace function public.is_admin_mfa()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin() and coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;

drop policy if exists "credit_accounts_write_admin_only" on public.credit_accounts;
create policy "credit_accounts_write_admin_only" on public.credit_accounts
  for all using (public.is_admin_mfa()) with check (public.is_admin_mfa());

drop policy if exists "installments_write_admin_only" on public.installments;
create policy "installments_write_admin_only" on public.installments
  for all using (public.is_admin_mfa()) with check (public.is_admin_mfa());

drop policy if exists "vouchers_update_admin_only" on public.vouchers;
create policy "vouchers_update_admin_only" on public.vouchers
  for update using (public.is_admin_mfa()) with check (public.is_admin_mfa());

create or replace function public.approve_voucher(voucher_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment_id uuid;
begin
  if not public.is_admin_mfa() then
    raise exception 'Se requiere verificacion en 2 pasos para aprobar vouchers';
  end if;

  select installment_id into v_installment_id from public.vouchers where id = voucher_id;

  update public.vouchers
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = voucher_id;

  update public.installments
  set status = 'paid', paid_at = now(), updated_by = auth.uid(), updated_at = now()
  where id = v_installment_id;
end;
$$;

grant execute on function public.is_admin_mfa() to authenticated;
