// Módulo compartido para las solicitudes de cotización (leads).
// Lo usan el modal de los paquetes (solicitud.js) y el form de Contáctanos
// (contacto-form.js). Hace dos cosas:
//   1) saveLead(data): guarda la solicitud en Supabase (tabla `leads`).
//   2) leadWhatsAppUrl(data): arma el link wa.me con toda la data formateada.
import { supabase } from './supabase-client.js';

const WA_NUMBER = '51987594032';

// Guarda el lead en Supabase. Devuelve { ok } o { ok:false, error }.
// Si el honeypot viene lleno, es un bot: no guarda y reporta ok (silencioso).
export async function saveLead(data) {
  if (data.gotcha) return { ok: true, skipped: true };

  const payload = {
    origen: data.origen || 'contacto',
    paquete: data.paquete || null,
    destino: data.destino || null,
    tipo_viaje: data.tipo || null,
    nombre: data.nombre || '',
    telefono: data.telefono || '',
    email: data.email || null,
    personas: data.personas ? Number(data.personas) : null,
    fecha_tentativa: data.fecha || null,
    financiamiento: !!data.financiamiento,
    mensaje: data.mensaje || null,
  };

  const { error } = await supabase.from('leads').insert(payload);
  if (error) {
    console.error('saveLead error:', error.message || error);
    return { ok: false, error };
  }
  return { ok: true };
}

// Arma el mensaje de WhatsApp con todos los datos disponibles.
export function leadWhatsAppUrl(data) {
  const lines = [
    'Hola, quiero solicitar una cotización 👋',
    '',
    data.paquete ? '📦 Paquete: ' + data.paquete : '',
    data.destino ? '🌎 Destino: ' + data.destino : '',
    data.tipo ? '🧳 Tipo de viaje: ' + data.tipo : '',
    '👤 Nombre: ' + (data.nombre || ''),
    '📱 Teléfono: ' + (data.telefono || ''),
    data.email ? '✉️ Email: ' + data.email : '',
    data.personas ? '👥 N° de personas: ' + data.personas : '',
    data.fecha ? '📅 Fecha tentativa: ' + data.fecha : '',
    data.financiamiento ? '💳 Me interesa el financiamiento' : '',
    data.mensaje ? '📝 Comentarios: ' + data.mensaje : '',
  ].filter(Boolean);
  return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
}
