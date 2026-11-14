// Grilla de piezas de la portada. Usa los mismos perfiles y dibujos del cotizador.
import { perfiles, obtenerPerfil, ladosPorDefecto, dibujarPerfil } from "./perfiles.js?v=3";
import { escaparHtml } from "./utils.js?v=3";

// Mismo orden que el mockup v2: techo, agua, alero, muros.
const ORDEN_PIEZAS = ["cumbrera", "canaleta", "cortagotera", "esquinero", "perfil_j", "perfil_l", "inicio"];

const TEXTO_PIEZA = {
  cumbrera: "Cierra la parte alta del techo.",
  canaleta: "Recoge el agua del borde del techo.",
  cortagotera: "Evita que el agua gotee desde el alero.",
  esquinero: "Cubre la esquina del muro.",
  perfil_j: "Remata una ventana o una puerta.",
  perfil_l: "Va donde el muro se junta con el techo.",
  inicio: "Arranca el revestimiento, abajo del muro.",
};

function enlaceCotizarPieza(perfilId) {
  return `cotizador.html?pieza=${encodeURIComponent(perfilId)}#cotizador`;
}

function tarjetaPieza(perfil) {
  return `<li class="pieza-card" data-reveal>
    <div class="pieza-dibujo" aria-hidden="true">${dibujarPerfil(perfil, ladosPorDefecto(perfil.id), { mini: true, ancho: 160, alto: 96 })}</div>
    <h3>${escaparHtml(perfil.nombre)}</h3>
    <p class="muted">${escaparHtml(TEXTO_PIEZA[perfil.id] || perfil.descripcionCorta)}</p>
    <p class="pieza-precio">Cálculo de desarrollo al instante</p>
    <a class="action action-amber pieza-cotizar" href="${enlaceCotizarPieza(perfil.id)}" aria-label="Calcular ${escaparHtml(perfil.nombre)}">Calcular</a>
  </li>`;
}

function tarjetaEspecial() {
  return `<li class="pieza-card" data-reveal>
    <div class="pieza-dibujo" aria-hidden="true"><svg viewBox="0 0 160 96"><path class="trazo-vivo" d="M28 70 52 38l22 24 22-30 24 26 12-14" fill="none" stroke="#1E293B" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 9"/></svg></div>
    <h3>Pieza especial</h3>
    <p class="muted">Otra forma, otro ángulo o una medida que no está aquí.</p>
    <p class="pieza-precio">Revisión geométrica por el taller</p>
    <a class="action action-amber pieza-cotizar" href="cotizador.html?especial">Pedir pieza especial</a>
  </li>`;
}

function tarjetasPiezas() {
  const elegidos = ORDEN_PIEZAS.map((id) => obtenerPerfil(id)).filter((perfil, i) => perfil.id === ORDEN_PIEZAS[i]);
  const resto = perfiles.filter((perfil) => !ORDEN_PIEZAS.includes(perfil.id));
  return [...elegidos, ...resto].map((perfil) => tarjetaPieza(perfil)).join("") + tarjetaEspecial();
}

if (typeof document !== "undefined") {
  const lista = document.querySelector("[data-piezas]");
  if (lista) lista.innerHTML = tarjetasPiezas();
}

export { ORDEN_PIEZAS, enlaceCotizarPieza, tarjetasPiezas };
