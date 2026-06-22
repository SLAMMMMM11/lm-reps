-- Tabla de "leads" / solicitudes de cotizacion enviadas desde los formularios
-- publicos (modal de paquete y pagina de contacto). A diferencia de la mayoria
-- de tablas, los VISITANTES SIN SESION (rol "anon") deben poder INSERTAR aqui,
-- porque cualquiera puede pedir una cotizacion. Solo el admin puede LEER y
-- ACTUALIZAR (cambiar el estado). Asi nadie puede ver los datos de otros.

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  origen text not null default 'contacto',          -- 'contacto' | 'paquete' | ...
  paquete text,                                       -- nombre del paquete si aplica
  destino text,                                       -- destino de interes (form contacto)
  tipo_viaje text,                                    -- paquete / boletos / tours / ...
  nombre text not null,
  telefono text not null,
  email text,
  personas int,
  fecha_tentativa date,
  financiamiento boolean not null default false,      -- pidio info de financiamiento
  mensaje text,
  status text not null default 'nuevo'
    check (status in ('nuevo', 'contactado', 'cotizado', 'cerrado'))
);

alter table public.leads enable row level security;

-- INSERT publico: cualquiera (incluso sin sesion) puede enviar una solicitud.
create policy "leads_insert_public" on public.leads
  for insert to anon, authenticated with check (true);

-- LECTURA y ACTUALIZACION solo admin (para el panel: ver y cambiar el estado).
create policy "leads_select_admin" on public.leads
  for select using (public.is_admin());

create policy "leads_update_admin" on public.leads
  for update using (public.is_admin()) with check (public.is_admin());

create policy "leads_delete_admin" on public.leads
  for delete using (public.is_admin());

-- GRANTS: sin esto Postgres rechaza el acceso antes de evaluar RLS (error 42501).
-- La clave aqui es el grant de INSERT a "anon" (el formulario publico).
grant usage on schema public to anon;
grant insert on public.leads to anon;
grant select, insert, update, delete on public.leads to authenticated;

-- Indice para ordenar las solicitudes mas recientes primero en el panel.
create index leads_created_at_idx on public.leads (created_at desc);
