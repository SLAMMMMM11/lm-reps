// Formulario de la página Contáctanos (cotización). Al enviar: abre WhatsApp con
// toda la data y guarda el lead en Supabase (origen='contacto'). Usa leads.js.
import { saveLead, leadWhatsAppUrl } from './leads.js';

const form = document.getElementById('contactoForm');
if (form) {
  const statusBox = document.getElementById('contactoStatus');
  const submitBtn = document.getElementById('contactoSubmit');

  const val = (n) => { const el = form.elements[n]; return el ? String(el.value || '').trim() : ''; };

  const collect = () => ({
    origen: 'contacto',
    destino: val('destino'),
    tipo: val('tipo'),
    nombre: val('nombre'),
    telefono: val('telefono'),
    email: val('email'),
    personas: val('personas'),
    fecha: val('fecha'),
    financiamiento: !!(form.elements['financiamiento'] && form.elements['financiamiento'].checked),
    mensaje: val('mensaje'),
    gotcha: val('gotcha'),
  });

  const setStatus = (cls, html) => { if (statusBox) { statusBox.className = cls; statusBox.innerHTML = html; } };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = collect();
    const waUrl = leadWhatsAppUrl(data);
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    submitBtn.disabled = true;
    const original = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Enviando...';
    setStatus('d-none', '');

    const res = await saveLead(data);
    if (res.ok) {
      setStatus('alert alert-success mt-3 mb-0',
        '¡Gracias! Recibimos tu solicitud y un asesor te contactará pronto. Si WhatsApp no se abrió, <a href="' + waUrl + '" target="_blank" rel="noopener noreferrer">toca aquí</a>.');
      form.reset();
    } else {
      setStatus('alert alert-warning mt-3 mb-0',
        'Tu solicitud se envió por WhatsApp. Si no se abrió, <a href="' + waUrl + '" target="_blank" rel="noopener noreferrer">toca aquí</a>.');
    }
    submitBtn.disabled = false;
    submitBtn.innerHTML = original;
  });
}
