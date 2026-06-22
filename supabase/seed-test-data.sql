-- Datos de prueba para ver el dashboard con contenido real.
-- Reemplaza el correo por el de tu cuenta de cliente ya registrada.

with cliente as (
  select id from auth.users where email = 'TU_CORREO_DE_PRUEBA@example.com'
),
nueva_cuenta as (
  insert into public.credit_accounts (customer_id, description, principal_amount, status)
  select id, 'Paquete Cancún 5D/4N', 1500.00, 'active' from cliente
  returning id
)
insert into public.installments (credit_account_id, installment_number, due_date, amount, status)
select id, 1, current_date - interval '10 days', 300.00, 'paid' from nueva_cuenta
union all
select id, 2, current_date + interval '5 days', 300.00, 'pending' from nueva_cuenta
union all
select id, 3, current_date + interval '35 days', 300.00, 'pending' from nueva_cuenta
union all
select id, 4, current_date + interval '65 days', 300.00, 'pending' from nueva_cuenta
union all
select id, 5, current_date + interval '95 days', 300.00, 'pending' from nueva_cuenta;
