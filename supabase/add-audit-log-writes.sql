-- Hace que aprobar un voucher tambien quede registrado en audit_log,
-- de forma atomica junto con la aprobacion (no depende de un insert
-- separado desde el cliente que podria fallar por separado).

create or replace function public.approve_voucher(voucher_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment_id uuid;
  v_amount numeric;
begin
  if not public.is_admin_mfa() then
    raise exception 'Se requiere verificacion en 2 pasos para aprobar vouchers';
  end if;

  select installment_id into v_installment_id from public.vouchers where id = voucher_id;
  select amount into v_amount from public.installments where id = v_installment_id;

  update public.vouchers
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = voucher_id;

  update public.installments
  set status = 'paid', paid_at = now(), updated_by = auth.uid(), updated_at = now()
  where id = v_installment_id;

  insert into public.audit_log (actor_id, action, target_table, target_id, details)
  values (auth.uid(), 'approve_voucher', 'vouchers', voucher_id, jsonb_build_object('installment_id', v_installment_id, 'amount', v_amount));
end;
$$;
