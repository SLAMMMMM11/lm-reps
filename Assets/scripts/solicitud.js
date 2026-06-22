// Modal "Solicitar cotización" de las páginas de paquete.
// Al enviar: (1) abre WhatsApp con la data (gesto del usuario => sin bloqueo de
// popup) y (2) guarda el lead en Supabase. Reutiliza el módulo leads.js.
import { saveLead, leadWhatsAppUrl } from './leads.js';

const form = document.getElementById('cotizarForm');
if (form) {
  const statusBox = document.getElementById('cotizarStatus');
  const submitBtn = document.getElementById('cotizarSubmit');

  const val = (name) => {
    const el = form.elements[name];
    return el ? String(el.value || '').trim() : '';
  };

  const collect = () => ({
    origen: 'paquete',
    paquete: val('paquete'),
    nombre: val('nombre'),
    telefono: val('telefono'),
    email: val('email'),
    personas: val('personas'),
    fecha: val('fecha'),
    mensaje: val('mensaje'),
    gotcha: val('gotcha'),
  });

  const setStatus = (cls, html) => {
    if (!statusBox) return;
    statusBox.className = cls;
    statusBox.innerHTML = html;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = collect();

    // 1) WhatsApp con la data (dentro del gesto del submit, no se bloquea)
    const waUrl = leadWhatsAppUrl(data);
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // 2) Guardar el lead en Supabase en segundo plano
    submitBtn.disabled = true;
    const original = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Enviando...';
    setStatus('d-none', '');

    const res = await saveLead(data);
    if (res.ok) {
      setStatus(
        'alert alert-success mt-3 mb-0',
        '¡Listo! Recibimos tu solicitud y un asesor te contactará pronto. Si WhatsApp no se abrió, <a href="' + waUrl + '" target="_blank" rel="noopener noreferrer">toca aquí</a>.'
      );
      form.reset();
    } else {
      setStatus(
        'alert alert-warning mt-3 mb-0',
        'Tu solicitud se envió por WhatsApp. Si no se abrió, <a href="' + waUrl + '" target="_blank" rel="noopener noreferrer">toca aquí</a>.'
      );
    }
    submitBtn.disabled = false;
    submitBtn.innerHTML = original;
  });
}
