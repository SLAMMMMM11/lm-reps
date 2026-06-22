-- LM-REPS: esquema de cuentas de credito directo
-- Pegar y ejecutar completo en Supabase: SQL Editor -> New query -> Run

-- ============================================================
-- 1. TABLAS
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  dni text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.credit_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  created_by uuid references public.profiles (id),
  description text not null,
  principal_amount numeric(10, 2) not null,
  status text not null default 'active' check (status in ('active', 'paid_off', 'cancelled')),
  created_at timestamptz not null default now()
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  credit_account_id uuid not null references public.credit_accounts (id) on delete cascade,
  installment_number int not null,
  due_date date not null,
  amount numeric(10, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'rejected')),
  paid_at timestamptz,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.vouchers (
  id uuid primary key default gen_random_uuid(),
  installment_id uuid not null references public.installments (id) on delete cascade,
  customer_id uuid not null references public.profiles (id),
  storage_path text not null,
  payment_method text not null check (payment_method in ('yape', 'plin', 'transferencia')),
  note text,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  target_table text not null,
  target_id uuid not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. TRIGGER: crear profile automaticamente al registrarse
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, dni)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'dni'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bloquear que un cliente se auto-promueva a admin
create function public.prevent_self_admin_promotion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ) then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

create trigger before_profile_update
  before update on public.profiles
  for each row execute function public.prevent_self_admin_promotion();

-- ============================================================
-- 3. FUNCION is_admin() para usar dentro de políticas RLS
-- ============================================================

create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ============================================================
-- 4. RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.credit_accounts enable row level security;
alter table public.installments enable row level security;
alter table public.vouchers enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- credit_accounts
create policy "credit_accounts_select_own_or_admin" on public.credit_accounts
  for select using (customer_id = auth.uid() or public.is_admin());

create policy "credit_accounts_write_admin_only" on public.credit_accounts
  for all using (public.is_admin()) with check (public.is_admin());

-- installments
create policy "installments_select_own_or_admin" on public.installments
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.credit_accounts ca
      where ca.id = credit_account_id and ca.customer_id = auth.uid()
    )
  );

create policy "installments_write_admin_only" on public.installments
  for all using (public.is_admin()) with check (public.is_admin());

-- vouchers
create policy "vouchers_select_own_or_admin" on public.vouchers
  for select using (customer_id = auth.uid() or public.is_admin());

create policy "vouchers_insert_own" on public.vouchers
  for insert with check (
    customer_id = auth.uid()
    and exists (
      select 1 from public.installments i
      join public.credit_accounts ca on ca.id = i.credit_account_id
      where i.id = installment_id and ca.customer_id = auth.uid()
    )
  );

create policy "vouchers_update_admin_only" on public.vouchers
  for update using (public.is_admin()) with check (public.is_admin());

-- audit_log
create policy "audit_log_select_admin_only" on public.audit_log
  for select using (public.is_admin());

create policy "audit_log_insert_admin_only" on public.audit_log
  for insert with check (public.is_admin());

-- ============================================================
-- 5. RPC: aprobar voucher de forma atomica (voucher + cuota)
-- ============================================================

create function public.approve_voucher(voucher_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede aprobar vouchers';
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

-- ============================================================
-- 6b. GRANTS: sin esto, Postgres rechaza el acceso a la tabla
-- ANTES de evaluar RLS (error 42501 "permission denied for table").
-- RLS solo filtra filas; el rol "authenticated" necesita el permiso
-- base sobre la tabla primero.
-- ============================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.credit_accounts to authenticated;
grant select, insert, update, delete on public.installments to authenticated;
grant select, insert, update, delete on public.vouchers to authenticated;
grant select, insert on public.audit_log to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.approve_voucher(uuid) to authenticated;

-- ============================================================
-- 6. STORAGE: bucket privado "vouchers"
-- ============================================================
-- Crear manualmente en Storage -> New bucket -> nombre "vouchers", Public = OFF.
-- Luego correr estas políticas (Storage -> vouchers -> Policies, o aquí mismo):

create policy "vouchers_storage_insert_own_folder" on storage.objects
  for insert with check (
    bucket_id = 'vouchers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vouchers_storage_select_own_or_admin" on storage.objects
  for select using (
    bucket_id = 'vouchers'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- ============================================================
-- 7. Despues de correr este script:
-- ============================================================
-- 1) Registrate una vez en el sitio (Pages/registro.html) para crear tu propio usuario.
-- 2) En Table Editor -> profiles, busca tu fila y cambia is_admin a true manualmente.
-- 3) Listo, esa cuenta ya puede usar el panel admin.
