// Carrito de piezas (proyecto de matemáticas): muestra desarrollo CM.D, ángulos, metros y tiras.
import { obtenerPerfil, dibujarPerfil } from "./perfiles.js?v=3";
import { describirTiras, formatoNumero, obtenerMaterial, nombreMaterial } from "./cotizador.js?v=3";
import { emisionActual, numeroBoleta } from "./demo/mockData.js?v=3";
import { escaparHtml } from "./utils.js?v=3";
import { icono } from "./iconos.js?v=3";
import { marcarCambio } from "./vida.js?v=3";
import { guardar, state, ui } from "./estado.js?v=3";
import { $, dom } from "./dom.js?v=3";
import { mostrarToast, resaltar } from "./interfaz.js?v=3";
import { renderSubvistaCliente, renderVista } from "./vistas.js?v=3";
import { abrirAuth } from "./sesion.js?v=3";
import { renderMisBoletas } from "./zona-cliente.js?v=3";

let cantidadVista = null;

export function renderCarrito() {
  const cantidad = state.carrito.length;
  const metrosTotales = state.carrito.reduce((suma, linea) => suma + (Number(linea.metros) || 0), 0);
  document.querySelectorAll(".nav-cotizacion-n").forEach((nodo) => {
    nodo.textContent = String(cantidad);
    if (cantidadVista !== null && cantidad > cantidadVista) {
      nodo.classList.remove("bump");
      void nodo.offsetWidth;
      nodo.classList.add("bump");
    }
  });
  cantidadVista = cantidad;
  dom.carritoContador.textContent = `${cantidad} ${cantidad === 1 ? "ítem" : "ítems"}`;
  const totalTexto = `${formatoNumero(metrosTotales)} Mts (${cantidad} ${cantidad === 1 ? "pieza" : "piezas"})`;
  if (dom.carritoTotal.textContent !== totalTexto) {
    dom.carritoTotal.textContent = totalTexto;
    marcarCambio(dom.carritoTotal);
  }
  const resumenTotal = document.querySelector("#resumen-total");
  if (resumenTotal) resumenTotal.textContent = totalTexto;
  $("#btn-cotizacion-pdf").disabled = cantidad === 0;

  dom.carritoConfirmado.innerHTML =
    state.ultimoFolio && cantidad === 0
      ? `<div class="m-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-base text-emerald-900">
          <p class="font-bold">✓ Orden <span class="measure">${numeroBoleta(state.ultimoFolio)}</span> emitida</p>
          <p class="mt-1 text-emerald-800">Pedido <span class="measure">${state.ultimoFolio}</span> en Etapa 1 · Lote N° ${state.numeroLote}.</p>
          <button type="button" class="mt-3 min-h-12 text-base font-semibold text-emerald-700 underline underline-offset-2" data-action="ver-boleta" data-folio="${state.ultimoFolio}">Ver en Mis Ordenes ${icono("flecha", "inline h-4 w-4 align-[-2px]")}</button>
        </div>`
      : "";

  dom.carritoLista.innerHTML = cantidad
    ? state.carrito
        .map((linea) => {
          const material = obtenerMaterial(linea.materialId);
          const perfil = obtenerPerfil(linea.perfilId);
          const angulos = linea.lados.map((lado, idx) =>
            lado.angulo !== undefined ? lado.angulo : perfil.lados[idx]?.angulo ?? 0
          );
          const detalleLados = linea.lados
            .map((lado, idx) => `${formatoNumero(lado.cm)} cm (${formatoNumero(angulos[idx], 0)}°)`)
            .join(" + ");
          return `
            <li class="flex gap-3 px-5 py-4">
              <span class="h-12 w-16 shrink-0 rounded-md bg-slate-50 p-1 ring-1 ring-slate-200">
                ${dibujarPerfil(perfil, linea.lados.map((lado) => lado.cm), { angulos, mini: true, ancho: 72, alto: 48 })}
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <p class="text-lg font-bold leading-tight text-navy">${escaparHtml(linea.nombre)}</p>
                  <button type="button" class="-mr-2 -mt-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-xl text-slate-500 hover:bg-red-50 hover:text-red-700" data-action="quitar-item" data-item="${linea.id}" aria-label="Quitar ${escaparHtml(linea.nombre)}">✕</button>
                </div>
                <p class="measure mt-0.5 text-base text-slate-500">${detalleLados}</p>
                <p class="measure mt-1 flex flex-wrap gap-x-3 text-base text-slate-600">
                  <span>CM.D <b class="text-navy">${formatoNumero(linea.cmD)} cm</b></span>
                  <span>${linea.espesor} mm</span>
                  <span>${formatoNumero(linea.metros)} Mts</span>
                </p>
                <div class="mt-1 flex items-end justify-between gap-2">
                  <p class="flex min-w-0 items-center gap-1.5 text-base text-slate-600">
                    <span class="h-3.5 w-3.5 shrink-0 rounded-sm ring-1 ring-slate-300" style="background:${material.muestra}"></span>
                    <span class="truncate">${escaparHtml(nombreMaterial(linea.materialId))}${linea.molde ? " · + molde" : ""}</span>
                  </p>
                  <p class="measure shrink-0 text-base font-bold text-navy">${describirTiras(linea.metros)}</p>
                </div>
              </div>
            </li>`;
        })
        .join("")
    : state.ultimoFolio
      ? ""
      : `<li class="px-5 py-10 text-center text-lg text-slate-600">
          <p class="flex justify-center text-slate-400" aria-hidden="true">${icono("recibo", "h-10 w-10")}</p>
          <p class="mt-2">Tu lista está vacía.</p>
          <p class="mt-1 text-base">Configura una pieza y presiona <b>Agregar a mi lista</b>.</p>
        </li>`;

  dom.carritoNota.textContent = "Resumen técnico de desarrollo (CM.D), ángulos y cortes en tiras de 3 m.";
}

export function quitarItem(itemId) {
  state.carrito = state.carrito.filter((linea) => linea.id !== itemId);
  guardar();
  renderCarrito();
}

export function confirmarCotizacion() {
  if (!state.carrito.length) {
    mostrarToast("Tu lista está vacía", "Agrega al menos un perfil antes de confirmar.", "alerta");
    return;
  }
  if (!state.sesion) {
    abrirAuth({ gate: true });
    return;
  }
  crearPedido();
}

function siguienteFolio() {
  const numeros = state.pedidos.map((pedido) => Number(pedido.folio.split("-")[1]) || 0);
  return `CG-${Math.max(1000, ...numeros) + 1}`;
}

export function crearPedido() {
  const folio = siguienteFolio();
  const obraPrincipal = state.cuenta.direcciones.find((d) => d.principal) ?? state.cuenta.direcciones[0];
  const pedido = {
    folio,
    boleta: numeroBoleta(folio),
    cliente: state.sesion.nombre,
    clienteEmail: state.sesion.email,
    telefono: state.sesion.telefono,
    obra: obraPrincipal?.alias || "Retiro en Taller Colegual",
    etapa: "recoleccion",
    ...emisionActual(),
    items: state.carrito.map((linea) => ({ ...linea, cortada: false })),
    total: 0,
  };
  state.pedidos.push(pedido);
  state.carrito = [];
  state.ultimoFolio = folio;
  ui.boletaSeleccionada = folio;
  guardar();
  renderCarrito();
  renderMisBoletas();
  renderSubvistaCliente();
  resaltar(dom.carrito);
  mostrarToast(
    `Orden ${pedido.boleta} emitida · Pedido ${folio}`,
    `Quedó registrada en Etapa 1 y entró al Lote N° ${state.numeroLote} del Panel del Taller.`
  );
}

export function irAlCarrito() {
  if (state.vista !== "cliente" || ui.subvistaCliente !== "portal") {
    state.vista = "cliente";
    ui.subvistaCliente = "portal";
    guardar();
    renderVista();
  }
  dom.carrito.scrollIntoView({ behavior: "smooth", block: "center" });
  resaltar(dom.carrito);
}
