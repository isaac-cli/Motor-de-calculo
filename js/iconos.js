// Íconos SVG del sitio en una sola línea gráfica: 24×24, trazo de 2 px redondeado y currentColor.
// Reemplazan a los emojis y a las flechas de texto (que en Windows se ven como emojis de color).
// Siempre decorativos: el texto del botón o la etiqueta lleva el significado.

const trazos = {
  telefono: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  correo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  ubicacion: '<path d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  escuadra: '<path d="M4 4v16h16Z"/><path d="M8 12v4h4Z"/>',
  casa: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  canaleta: '<path d="M3 7v5a4 4 0 0 0 4 4h10a4 4 0 0 0 4-4V7"/><path d="M12 16v4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCirculo: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  flecha: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  volver: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  externo: '<path d="M7 17 17 7M9 7h8v8"/>',
  herramienta: '<path d="M15 4a5 5 0 0 0-4.6 6.9L4 17.3V20h2.7l6.4-6.4A5 5 0 0 0 20 9l-3 1-2-2 1-3Z"/>',
  regla: '<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 8v3M10 8v4M14 8v3M18 8v4"/>',
  documento: '<path d="M7 3h7l5 5v13H7Z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  usuario: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  rayo: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
  recibo: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/>',
  bandeja: '<path d="M3 13h5l1 3h6l1-3h5"/><path d="M5 5h14l2 8v6H3v-6Z"/>',
  camion: '<path d="M3 6h11v10H3ZM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  tijera: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.6 7.6 20 18M8.6 16.4 20 6"/>',
  descargar: '<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>',
  reabrir: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"/><path d="M4 4v4.6h4.6"/>',
  reiniciar: '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.6"/><path d="M20 4v4.6h-4.6"/>',
  girar: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
};

// Devuelve el <svg> del ícono `nombre` con las clases de tamaño y color que se pidan.
export function icono(nombre, clase = "h-5 w-5") {
  return `<svg class="${clase} shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${trazos[nombre] ?? ""}</svg>`;
}
