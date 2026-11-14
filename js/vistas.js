// Cambio entre la vista cliente, la Zona Administrativa y el panel del taller; menú móvil.
import { guardar, state, ui } from "./estado.js?v=3";
import { dom } from "./dom.js?v=3";
import { activarReveal } from "./vida.js?v=3";

export function renderSubvistaCliente() {
  const enCuenta = ui.subvistaCliente === "cuenta" && Boolean(state.sesion);
  dom.portalCliente?.classList.toggle("hidden", enCuenta);
  dom.vistaCuenta?.classList.toggle("hidden", !enCuenta);
  if (enCuenta) {
    import("./cuenta.js?v=3").then(({ renderVistaCuenta }) => {
      renderVistaCuenta({ state, ui, contenedor: dom.vistaCuenta });
      activarReveal(dom.vistaCuenta);
    });
  }
}

function mostrarBarra(nodo, visible) {
  if (!nodo) return;
  nodo.classList.toggle("hidden", !visible);
  nodo.hidden = !visible;
}

function aplicarVista(esTaller) {
  dom.vistaCliente.classList.toggle("hidden", esTaller);
  mostrarBarra(dom.navCliente, !esTaller);
  dom.vistaTaller.classList.toggle("hidden", !esTaller);
  mostrarBarra(dom.navTaller, esTaller);
  document.querySelectorAll('[data-action="cambiar-vista"]').forEach((boton) => {
    boton.setAttribute("aria-pressed", String(boton.dataset.vista === state.vista));
  });
  if (esTaller) activarReveal(dom.vistaTaller);
  else renderSubvistaCliente();
}

export function renderVista() {
  const esTaller = state.vista === "taller";
  if (!esTaller) {
    aplicarVista(false);
    return Promise.resolve();
  }
  // El módulo pinta la bandeja mientras el panel sigue oculto. Mostrarlo vacío y llenarlo
  // después empujaba «Lote y tablero» (CLS 0,29–0,35 con movimiento reducido).
  return import("./panel-taller.js?v=3").then(({ renderTaller }) => {
    if (state.vista !== "taller") return;
    renderTaller();
    aplicarVista(true);
  });
}

export function cambiarVista(vista) {
  if (state.vista === vista && ui.subvistaCliente === "portal") return Promise.resolve();
  state.vista = vista;
  if (vista === "cliente") ui.subvistaCliente = "portal";
  guardar();
  return renderVista().then(() => {
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: suave ? "smooth" : "instant" });
  });
}

export function toggleMenu(boton) {
  const menu = document.querySelector("#mobile-menu");
  if (!menu || !boton) return;
  const abierto = menu.hidden;
  menu.hidden = !abierto;
  boton.setAttribute("aria-expanded", String(abierto));
  boton.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
}

export function cerrarMenu() {
  const menu = document.querySelector("#mobile-menu");
  if (menu) menu.hidden = true;
  document.querySelector("#menu-toggle")?.setAttribute("aria-expanded", "false");
}
