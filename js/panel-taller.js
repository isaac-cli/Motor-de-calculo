// Panel del taller.
import { etapas, formatoFechaCorta } from "./demo/mockData.js?v=3";
import { consolidarLote, renderLote, renderConsolidado, renderKanban, renderFicha, renderSolicitudesEspeciales, renderBandeja } from "./taller.js?v=3";
import { guardar, state, ui } from "./estado.js?v=3";
import { dom } from "./dom.js?v=3";
import { horaActual, mostrarToast } from "./interfaz.js?v=3";
import { renderMisBoletas } from "./zona-cliente.js?v=3";
import { activarReveal } from "./vida.js?v=3";

export function renderTaller() {
  const consolidado = consolidarLote(state.pedidos);
  dom.tallerLote.innerHTML = renderLote({ numeroLote: state.numeroLote, consolidado });
  dom.tallerConsolidado.innerHTML = renderConsolidado(consolidado);
  dom.tallerKanban.innerHTML = renderKanban(state.pedidos, { modoPantalla: ui.modoPantalla });
  dom.tallerEspeciales.innerHTML = renderSolicitudesEspeciales(state.solicitudesEspeciales);
  if (dom.tallerBandeja) dom.tallerBandeja.innerHTML = renderBandeja({ solicitudes: state.solicitudesEspeciales, pedidos: state.pedidos });
  dom.tallerAbastecimiento.classList.toggle("hidden", ui.modoPantalla);
  dom.tallerKanban.classList.toggle("lg:grid-cols-4", ui.modoPantalla);
  dom.btnModoPantalla.setAttribute("aria-pressed", String(ui.modoPantalla));
  dom.btnModoPantalla.classList.toggle("!border-amber-500", ui.modoPantalla);
  dom.btnModoPantalla.classList.toggle("!text-amber-300", ui.modoPantalla);
  dom.tallerFecha.textContent = `Hoy: ${formatoFechaCorta(new Date())} · ${horaActual()}`;
  activarReveal(dom.vistaTaller);
}

export function cerrarLote() {
  const consolidado = consolidarLote(state.pedidos);
  if (!consolidado.pedidos.length) return;
  const [delgado, reforzado] = consolidado.espesores;
  const numeroCerrado = state.numeroLote;
  consolidado.pedidos.forEach((pedido) => {
    pedido.etapa = "material";
  });
  state.numeroLote += 1;
  guardar();
  renderTaller();
  renderMisBoletas();
  mostrarToast(
    `Lote N° ${numeroCerrado} cerrado · ${consolidado.pedidos.length} pedidos a Material en Taller`,
    `Compra: ${delgado.planchas} planchas 0.4 mm, ${reforzado.planchas} planchas 0.5 mm y ${consolidado.moldes.length} moldes de cartón.`
  );
}

export function avanzarPedido(folio) {
  const pedido = state.pedidos.find((actual) => actual.folio === folio);
  // "entregado" es el estado final; sin esta guarda volvería a la primera etapa.
  if (!pedido || pedido.etapa === "entregado") return;
  const indice = etapas.findIndex((etapa) => etapa.id === pedido.etapa);
  const siguiente = etapas[indice + 1];
  pedido.etapa = siguiente ? siguiente.id : "entregado";
  guardar();
  renderTaller();
  renderMisBoletas();
  mostrarToast(
    `${pedido.folio} → ${siguiente ? siguiente.titulo : "Entregado"}`,
    siguiente ? `El aviso a ${pedido.cliente} está por confirmar.` : "El pedido sale del tablero.",
    siguiente?.id === "listo" ? "ok" : "info"
  );
}

function pedidoEnFicha() {
  return ui.ficha ? state.pedidos.find((pedido) => pedido.folio === ui.ficha.folio) : null;
}

function renderFichaModal() {
  const pedido = pedidoEnFicha();
  if (!pedido) return;
  dom.modalFicha.innerHTML = renderFicha(pedido, ui.ficha.indice);
}

export function abrirFicha(folio) {
  ui.ficha = { folio, indice: 0 };
  renderFichaModal();
  dom.modalFicha.showModal();
}

export function moverFicha(paso) {
  const pedido = pedidoEnFicha();
  if (!pedido) return;
  ui.ficha.indice = Math.min(Math.max(ui.ficha.indice + paso, 0), pedido.items.length - 1);
  renderFichaModal();
}

export function marcarCortada() {
  const pedido = pedidoEnFicha();
  if (!pedido) return;
  const linea = pedido.items[ui.ficha.indice];
  linea.cortada = !linea.cortada;
  guardar();
  if (linea.cortada && ui.ficha.indice < pedido.items.length - 1) ui.ficha.indice += 1;
  renderFichaModal();
  renderTaller();
}

export function fichaAListo() {
  const pedido = pedidoEnFicha();
  if (!pedido) return;
  dom.modalFicha.close();
  avanzarPedido(pedido.folio);
}

export function toggleModoPantalla() {
  ui.modoPantalla = !ui.modoPantalla;
  renderTaller();
}
