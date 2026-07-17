# gerencia@lm-reps.com — cortar el spam (guía paso a paso)

Diagnóstico hecho el 2026-07-17: SPF ✅ y DKIM ✅ ya están bien. Lo que falta:

## 1. Subir DMARC de `p=none` a `p=quarantine` (el fix más importante)

Hoy tu dominio dice "si alguien envía correos haciéndose pasar por @lm-reps.com,
no hagas nada" (`p=none`). Gran parte del spam llega así (incluso "de ti mismo").

**Pasos en Namecheap:**
1. Entra a namecheap.com → Domain List → `lm-reps.com` → **Manage** → pestaña **Advanced DNS**.
2. Busca el registro TXT con host `_dmarc` (valor actual: `v=DMARC1; p=none;`).
3. Edítalo y reemplaza el valor por:

   ```
   v=DMARC1; p=quarantine; rua=mailto:gerencia@lm-reps.com; fo=1
   ```

4. Guarda. Tarda hasta 1 hora en propagar. (Si en 2-3 semanas no hay problemas
   con correos legítimos, se puede endurecer a `p=reject`.)

## 2. Verificar que el catch-all esté DESACTIVADO

Si está activo, cualquier-cosa-inventada@lm-reps.com cae en tu bandeja — es la
causa #1 de volumen de spam.

1. Namecheap → Domain List → pestaña **Private Email** (o privateemail.com → login).
2. En la administración del dominio de correo, busca **Catch-All**.
3. Debe estar en **Disabled / Off**. Si está apuntando a gerencia@, desactívalo.

## 3. Entrenar el filtro (en el webmail)

- En privateemail.com, cuando llegue spam: **no lo borres** — usa el botón
  **"Marcar como spam"** (icono de escudo/spam). Eso entrena el filtro; borrarlo no.
- Para remitentes repetitivos: clic derecho sobre el correo → **Crear regla** →
  eliminar/mover a spam todo lo de ese remitente o dominio.

## 4. Higiene

- `gerencia@` NO está publicado en la web (verificado) — mantenlo así: para
  clientes usa siempre `reservas@`.
- No uses gerencia@ para registrarte en sitios/promociones; si necesitas
  registros, crea un alias (p. ej. registros@) que puedas desechar.

---
*La firma nueva está en `firma-gerencia.html` (misma carpeta). Falta solo la
tira de instituciones: guárdala desde el webmail y avísale a Claude.*
