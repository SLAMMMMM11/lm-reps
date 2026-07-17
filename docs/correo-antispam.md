# gerencia@lm-reps.com — cortar el spam

Diagnóstico 2026-07-17: SPF ✅ y DKIM ✅ estaban bien. Se aplicaron los dos
arreglos grandes ese mismo día (con Harold en línea):

> **Dato clave:** el DNS de lm-reps.com NO se administra en Namecheap — los
> nameservers apuntan a **Netlify DNS** (dns1-4.p05.nsone.net). Cualquier
> registro se edita en app.netlify.com → Domains → lm-reps.com, o vía
> `netlify api` (zona `692333322f7dd30b31da1ae8`). La pestaña "Advanced DNS"
> de Namecheap no tiene efecto.

## 1. DMARC subido a `p=quarantine` — ✅ HECHO 2026-07-17

Registro TXT `_dmarc` en Netlify DNS, verificado en la zona:

```
v=DMARC1; p=quarantine; rua=mailto:gerencia@lm-reps.com; fo=1
```

- Le dice a Gmail/Outlook: correo que diga ser @lm-reps.com y no pase la
  verificación → a spam. Antes (`p=none`) no se hacía nada.
- **Efecto secundario normal:** llegarán reportes automáticos (correos con
  XML adjunto, asunto "Report domain: lm-reps.com") a gerencia@. Se ignoran
  o se crea una regla para archivarlos.
- Si en 2-3 semanas no hay problemas con correos legítimos, se puede
  endurecer a `p=reject`.

## 2. Catch-All desactivado — ✅ HECHO 2026-07-17

Estaba ACTIVO apuntando a gerencia@ (los logs de Jellyfish mostraban spam
entregado a buzones inexistentes: accounting@, contacto@…). Harold lo puso
en **None** en Namecheap → Domain List → lm-reps.com → Private Email →
sección Email Security → "Catch-All Mailbox". Ahora los correos a
direcciones inexistentes rebotan.

Buzones reales (5/5): gerencia@, legal@, reservas@, ventas@, viajes@.

## 3. Entrenar el filtro (hábito continuo)

- En el webmail, cuando llegue spam: **no borrarlo** — usar **"Marcar como
  spam"**. Eso entrena el filtro; borrar no.
- **Jellyfish** (panel en jellyfish.ai, pestañas Blocklist/Acceptlist/Logs/
  Settings): para remitentes que insisten, agregarlos a la **Blocklist**
  (se puede bloquear el dominio completo). Candidatos vistos en los logs:
  `siscomar02/03/04.com.ar` (mailing Ladevi — si es publicidad gremial que
  no interesa, primero probar el enlace "unsubscribe"; si no, blocklist).
- Anti-Spoof Filter de PrivateEmail: ON ✅ (no tocar).

## 4. Higiene

- `gerencia@` NO está publicado en la web — mantenerlo así: para clientes
  usar siempre `reservas@`.
- No usar gerencia@ para registrarse en sitios/promociones.

## Pendientes de cuenta (no spam, pero importantes)

- Cuenta Namecheap con **2FA apagado** → activarlo.
- Private Email **vence 26-dic-2026 con auto-renew OFF** → renovar a tiempo.
- Aviso Namecheap: migración a webmail nuevo desde el 3-ago-2026 (automática;
  credenciales e IMAP/SMTP no cambian).

---
*La firma de Cindy está en `firma-gerencia.html` (misma carpeta) — funcionando
desde 2026-07-17. En el celular la firma NO se hereda: configurar una firma
corta de texto en la app móvil.*
