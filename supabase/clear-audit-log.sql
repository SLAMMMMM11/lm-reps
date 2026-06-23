-- Borra todo el historial de auditoria acumulado mientras se probaban
-- los roles de admin y la migracion de cuentas. El historial queda vacio
-- y empieza a llenarse de nuevo con acciones reales desde aqui.

delete from public.audit_log;

-- Verificacion: debe devolver 0 filas.
select * from public.audit_log;
