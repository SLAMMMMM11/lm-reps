// Menú "Destinos" del navbar: se muestran SIEMPRE los 10 países con página
// de destino (markup fijo, sin ocultar ninguno).
//
// Antes este script ocultaba el país si no tenía ningún paquete/afiche
// activo en el manifiesto — decisión revertida (2026-07-18): cada página de
// país (/destinos/{pais}) ya tiene contenido propio de sobra (reseña,
// destacados, galería, cuándo ir) y sus secciones de "Itinerarios" y
// "Afiches y promociones" se ocultan solas cuando no tienen datos
// (destino-paquetes.js / destino-flyers.js). No hay motivo para que el país
// completo desaparezca del menú solo porque no tiene una promoción activa
// en este momento — los afiches ya viven aparte en /promociones.
