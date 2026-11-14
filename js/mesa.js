// Mesa de configuración (proyecto de matemáticas): perfil, lados, ángulos, espesor, material y cálculo de desarrollo/tiras.
import { checkApiStatus, cotizarEnApi } from "./api.js?v=3";
import { perfiles, obtenerPerfil, ladosPorDefecto, angulosPorDefecto, ladosVacios, dibujarPerfil } from "./perfiles.js?v=3";
import {
  tarifas,
  materiales,
  formatoNumero,
  obtenerMaterial,
  nombreMaterial,
  calcularDesarrollo,
  MENSAJE_MEDIDAS_VACIAS,
  cotizacionIncompleta,
  validarCotizacion,
  calcularLocal,
  describirTiras,
  crearItemCotizacion,
} from "./cotizador.js?v=3";
import { escaparHtml } from "./utils.js?v=3";
import { api, guardar, state, ui } from "./estado.js?v=3";
import { guardarMesa } from "./mesa-estado.js?v=3";
import { $, dom } from "./dom.js?v=3";
import { desplazarHasta, mostrarToast, resaltar } from "./interfaz.js?v=3";
import { renderCarrito } from "./carrito.js?v=3";

function renderSelectorPerfiles() {
  dom.selectorPerfiles.innerHTML = perfiles
    .map(
      (perfil) => `
        <li>
          <button type="button" data-action="seleccionar-perfil" data-perfil="${perfil.id}" aria-pressed="${perfil.id === ui.perfilId}"
            class="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 aria-pressed:bg-amber-50 aria-pressed:shadow-[inset_4px_0_0_#D97706]">
            <span class="h-12 w-16 shrink-0 rounded bg-white p-0.5 ring-1 ring-slate-200">
              ${dibujarPerfil(perfil, ladosPorDefecto(perfil.id), { mini: true, ancho: 72, alto: 48 })}
            </span>
            <span class="min-w-0">
              <span class="block text-lg font-bold text-navy">${perfil.nombre}</span>
              <span class="block text-base leading-snug text-slate-500">${perfil.descripcionCorta}</span>
            </span>
          </button>
        </li>`
    )
    .join("");
}

function renderLadosMesa() {
  const perfil = obtenerPerfil(ui.perfilId);
  if (!Array.isArray(ui.angulos) || ui.angulos.length !== perfil.lados.length) {
    ui.angulos = angulosPorDefecto(ui.perfilId);
  }
  dom.mesaTitulo.textContent = perfil.nombre;
  dom.mesaPliegues.textContent = `${perfil.lados.length} lados · ${perfil.lados.length - 1} pliegues`;
  dom.mesaLados.innerHTML = perfil.lados
    .map(
      (lado, indice) => `
        <label class="flex items-center justify-between gap-3">
          <span class="min-w-0 flex-1 text-lg font-medium text-slate-700">${lado.nombre}</span>
          <span class="lado-campo relative block w-28 shrink-0">
            <input type="number" inputmode="decimal" min="0" max="122" step="0.5" class="input-cm" data-lado="${indice}"
              value="${ui.lados[indice] ?? ""}" placeholder="${lado.cm}" aria-label="${lado.nombre}, en centímetros">
            <span class="measure pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-base font-semibold text-slate-600">cm</span>
          </span>
        </label>`
    )
    .join("");
}

export function renderEspesores() {
  dom.mesaEspesores.innerHTML = Object.values(tarifas)
    .map(
      (tarifa) => `
        <label class="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-300 px-3 py-2.5 transition hover:border-slate-400 has-[:checked]:border-accent has-[:checked]:bg-amber-50 has-[:checked]:ring-2 has-[:checked]:ring-accent/20">
          <span class="flex items-center gap-2.5">
            <input type="radio" name="espesor" value="${tarifa.espesor}" class="h-6 w-6 shrink-0 accent-amber-600" ${tarifa.espesor === ui.espesor ? "checked" : ""}>
            <span>
              <span class="block text-lg font-semibold text-slate-800">Prepintada / Zincalum <span class="measure">${tarifa.etiqueta}</span></span>
              <span class="block text-base text-slate-500">Espesor de lámina para plegado</span>
            </span>
          </span>
          <span class="measure text-right text-base font-bold text-navy">${tarifa.etiqueta}</span>
        </label>`
    )
    .join("");
}

export function renderMateriales() {
  dom.mesaMateriales.innerHTML = materiales
    .map(
      (material) => `
        <label class="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center" title="${material.tipo} ${material.color}">
          <input type="radio" name="material" value="${material.id}" class="peer sr-only" ${material.id === ui.materialId ? "checked" : ""}>
          <span class="block h-12 w-12 rounded-md ring-1 ring-slate-300 transition peer-checked:ring-2 peer-checked:ring-accent peer-checked:ring-offset-2 peer-focus-visible:ring-4 peer-focus-visible:ring-accent"
            style="background:${material.muestra}"></span>
          <span class="sr-only">${material.tipo} ${material.color}</span>
        </label>`
    )
    .join("");
  renderNombreMaterial();
}

export function renderNombreMaterial() {
  const material = obtenerMaterial(ui.materialId);
  dom.mesaMaterialNombre.innerHTML = `<span class="font-semibold text-slate-700">${material.tipo}</span> · ${material.color}`;
}

export function renderEsquema() {
  const perfil = obtenerPerfil(ui.perfilId);
  if (!Array.isArray(ui.angulos) || ui.angulos.length !== perfil.lados.length) {
    ui.angulos = angulosPorDefecto(ui.perfilId);
  }
  dom.mesaSvg.innerHTML = dibujarPerfil(perfil, ui.lados, {
    angulos: ui.angulos,
    ladoActivo: ui.ladoActivo,
    letras: false,
    mostrarAngulo: true,
    interactivo: true,
    transformacionFija: ui.transformacionLienzo || null,
  });

  const terminos = ui.lados
    .map((valor, indice) => {
      const clase = indice === ui.ladoActivo ? "text-amber-800 underline decoration-2 underline-offset-4" : "";
      return `<span class="${clase}">${valor === null || valor === "" ? "—" : formatoNumero(valor)}</span>`;
    })
    .join(` <span class="text-slate-500">+</span> `);
  const hayVacio = ui.lados.some((valor) => valor === null || valor === "");
  const cmD = calcularDesarrollo(ui.lados);
  const suma = hayVacio ? "—" : `${formatoNumero(cmD)} cm`;
  dom.mesaFormula.innerHTML = `${terminos} <span class="text-slate-500">=</span> <span class="whitespace-nowrap text-amber-800">${suma}</span>`;
}

function datosMesa() {
  return { ladosCm: ui.lados, angulos: ui.angulos, espesor: ui.espesor, metros: ui.metros, molde: ui.molde };
}

export function renderPrecio() {
  const datos = datosMesa();
  const hayAlgunLado = ui.lados.some((valor) => valor !== null && valor !== "" && Number(valor) > 0);
  const todosLadosCompletos = ui.lados.length > 0 && ui.lados.every((valor) => valor !== null && valor !== "" && !Number.isNaN(Number(valor)));
  const cmDParcial = calcularDesarrollo(ui.lados);

  if (cotizacionIncompleta(datos)) {
    dom.mesaDesglose.innerHTML = todosLadosCompletos
      ? `Desarrollo (<span class="measure font-bold text-navy">CM.D</span>): <span class="measure font-bold text-navy">${formatoNumero(cmDParcial)} cm</span> · Indica los metros lineales para calcular las tiras.`
      : MENSAJE_MEDIDAS_VACIAS;
    dom.mesaTotal.textContent = hayAlgunLado ? `${formatoNumero(cmDParcial)} cm` : "—";
    dom.mesaTiras.textContent = "";
    dom.btnAgregar.disabled = true;
    dom.mesaErrores.classList.add("hidden");
    dom.mesaErrores.innerHTML = "";
    $("#mesa-ayuda-especial").classList.add("hidden");
    programarCotizacionApi(false);
    return;
  }

  const errores = validarCotizacion(datos);
  const calculo = calcularLocal(datos);
  const valido = errores.length === 0;
  const tirasTexto = describirTiras(calculo.metros);

  dom.mesaDesglose.innerHTML = `
    Desarrollo (<span class="measure font-semibold">CM.D</span>): <span class="font-bold text-navy">${formatoNumero(calculo.cmD)} cm</span>
    · Largo: <span class="font-bold text-navy">${formatoNumero(calculo.metros)} Mts</span>
    ${ui.molde ? ` · + Molde en cartón` : ""}`;
  dom.mesaTotal.textContent = valido ? `${formatoNumero(calculo.cmD)} cm` : "—";
  dom.mesaTiras.textContent = valido ? `Corte: ${tirasTexto} de plancha (3 m)` : "";
  dom.btnAgregar.disabled = !valido;

  dom.mesaErrores.classList.toggle("hidden", valido);
  dom.mesaErrores.innerHTML = errores.map((error) => `<li>• ${escaparHtml(error)}</li>`).join("");
  $("#mesa-ayuda-especial").classList.toggle("hidden", valido);

  programarCotizacionApi(valido);
}

export function renderResultado() {
  renderEsquema();
  renderPrecio();
}

let temporizadorApi = null;
let secuenciaApi = 0;

function programarCotizacionApi(valido) {
  clearTimeout(temporizadorApi);
  secuenciaApi += 1;
  if (!api.online || !valido) {
    api.estado = api.online ? "inactivo" : "offline";
    renderEstadoApiMesa();
    return;
  }
  api.estado = "cargando";
  renderEstadoApiMesa();
  const secuencia = secuenciaApi;
  temporizadorApi = setTimeout(async () => {
    try {
      const resultado = await cotizarEnApi({
        perfilId: ui.perfilId,
        material: nombreMaterial(ui.materialId),
        espesor: ui.espesor,
        ladosCm: ui.lados.map(Number),
        metros: Number(ui.metros),
      });
      if (secuencia !== secuenciaApi) return;
      Object.assign(api, { estado: "ok", resultado, error: null });
    } catch (error) {
      if (secuencia !== secuenciaApi) return;
      Object.assign(api, { estado: "error", resultado: null, error: error.message });
    }
    renderEstadoApiMesa();
  }, 350);
}

function renderEstadoApiMesa() {
  const calculo = calcularLocal(datosMesa());
  const tieneMetros = Number(calculo.metros) > 0 && calculo.cmD > 0;
  const resumenCorte = tieneMetros
    ? `<span class="mt-1 block text-slate-700">Desglose de tiras (3 m): <strong class="measure text-navy">${describirTiras(calculo.metros)}</strong></span>`
    : "";
  let estado = "";

  if (api.estado === "offline") {
    estado = `<span class="text-slate-600">● Cálculo geométrico en tiempo real</span>`;
  } else if (api.estado === "cargando") {
    estado = `<span class="text-slate-600">⟳ Validando con la API…</span>`;
  } else if (api.estado === "error") {
    estado = `<span class="text-red-700">● API: ${escaparHtml(api.error)}</span>`;
  } else if (api.estado === "ok" && api.resultado) {
    const { desarrollo_cm: desarrolloCm } = api.resultado;
    estado = `<span class="text-emerald-800">✓ API validó CM.D = ${formatoNumero(desarrolloCm)} cm</span>`;
  }
  dom.mesaApi.innerHTML = `${estado}${resumenCorte}`;
}

export function cargarPerfil(perfilId, { desplazar = false, conservar = false } = {}) {
  const siguiente = obtenerPerfil(perfilId).id;
  const conserva = conservar && siguiente === ui.perfilId && Array.isArray(ui.lados);
  ui.perfilId = siguiente;
  if (!conserva) {
    ui.lados = ladosVacios(ui.perfilId);
    ui.angulos = angulosPorDefecto(ui.perfilId);
    ui.ladoActivo = 0;
  } else if (!Array.isArray(ui.angulos) || ui.angulos.length !== obtenerPerfil(siguiente).lados.length) {
    ui.angulos = angulosPorDefecto(ui.perfilId);
  }
  renderSelectorPerfiles();
  renderLadosMesa();
  renderResultado();
  guardarMesa(ui);
  if (desplazar) {
    $("#cotizador").scrollIntoView({ behavior: "smooth" });
    mostrarToast(`${obtenerPerfil(perfilId).nombre} cargado`, "Ajusta las medidas y ángulos de cada lado.", "info");
  }
}

export function enfocarPrimerLado() {
  const primerLado = dom.mesaLados.querySelector("input[data-lado]");
  if (!primerLado) return;
  desplazarHasta(primerLado);
  primerLado.focus({ preventScroll: true });
}

export function restablecerAngulosMesa() {
  ui.angulos = angulosPorDefecto(ui.perfilId);
  ui.transformacionLienzo = null;
  renderEsquema();
  guardarMesa(ui);
}

export function limpiarMesa() {
  const perfil = obtenerPerfil(ui.perfilId);
  ui.lados = perfil.lados.map(() => null);
  ui.angulos = angulosPorDefecto(ui.perfilId);
  ui.ladoActivo = 0;
  ui.metros = null;
  ui.molde = false;
  dom.mesaMetros.value = "";
  dom.mesaMolde.checked = false;
  renderLadosMesa();
  renderResultado();
  dom.mesaLados.querySelector("input[data-lado]")?.focus();
  guardarMesa(ui);
}

export function agregarAlCarrito() {
  if (validarCotizacion(datosMesa()).length) return;
  const perfil = obtenerPerfil(ui.perfilId);
  const linea = crearItemCotizacion({
    perfil,
    ladosCm: ui.lados.map(Number),
    angulos: [...ui.angulos],
    espesor: ui.espesor,
    materialId: ui.materialId,
    metros: Number(ui.metros),
    molde: ui.molde,
  });
  state.carrito.push(linea);
  state.ultimoFolio = null;
  guardar();
  renderCarrito();
  resaltar(dom.carrito);
  mostrarToast(
    `${perfil.nombre} agregado a la lista`,
    `CM.D ${formatoNumero(linea.cmD)} cm · ${formatoNumero(linea.metros)} Mts · ${describirTiras(linea.metros)}`
  );
}

async function actualizarEstadoApi() {
  const online = await checkApiStatus();
  const cambio = online !== api.online;
  api.online = online;
  if (cambio) renderPrecio();
}
