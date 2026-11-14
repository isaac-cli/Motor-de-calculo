// Mapa 3D "¿Dónde va cada lata?" (sin precios, enfocado en desarrollo y geometría).
import { obtenerPerfil, ladosPorDefecto, dibujarPerfil } from "./perfiles.js?v=3";
import { calcularDesarrollo, formatoNumero } from "./cotizador.js?v=3";
import { zonaDePerfil } from "./zonas-obra.js?v=3";
import { ui } from "./estado.js?v=3";
import { icono } from "./iconos.js?v=3";
import { dom } from "./dom.js?v=3";
import { desplazarHasta, mostrarToast, resaltar } from "./interfaz.js?v=3";
import { cargarPerfil, enfocarPrimerLado } from "./mesa.js?v=3";

let temporizadorZona = null;
let visorCasa3D = null;
let visorPedido = false;

function zonaMostrada() {
  return ui.zonaPrevia ?? ui.zona;
}

function opcionesVisor() {
  return {
    contenedor: dom.mapaObra,
    obtenerZonaActiva: zonaMostrada,
    alSeleccionarZona: (perfilId) => seleccionarZona(perfilId, { enfocar3D: false }),
    alPrevisualizarZona: (perfilId) => {
      clearTimeout(temporizadorZona);
      if (perfilId !== zonaMostrada()) {
        temporizadorZona = setTimeout(() => previsualizarZona(perfilId), 90);
      }
    },
  };
}

function mostrarRespaldo() {
  dom.mapaObra.innerHTML = `
    <img src="static/img/vivienda-dos-pisos-800.webp?v=1" alt="Foto de una vivienda donde Colegual hizo parte de la construcción y la hojalatería" class="block aspect-video h-auto w-full object-cover object-center" width="800" height="450" loading="lazy" decoding="async">
    <div class="space-y-3 p-4">
      <p class="text-base text-slate-200">No pudimos mostrar la casa en 3D en este navegador.</p>
      <a class="btn-primary min-h-12" href="#catalogo">Ver el catálogo de perfiles</a>
    </div>`;
}

async function iniciarVisor() {
  try {
    const prueba = document.createElement("canvas");
    if (!prueba.getContext("2d")) throw new Error("sin canvas");
    const { crearVisorCasa3D } = await import("./casa3d.js?v=3");
    visorCasa3D = crearVisorCasa3D(opcionesVisor());
    renderZonaActiva();
  } catch {
    visorCasa3D = null;
    mostrarRespaldo();
  }
}

export function renderMapaObra() {
  if (visorPedido || !dom.mapaObra) return;
  visorPedido = true;
  const observador = new IntersectionObserver((entradas) => {
    if (!entradas.some((entrada) => entrada.isIntersecting)) return;
    observador.disconnect();
    window.setTimeout(iniciarVisor, 0);
  }, { threshold: 0.2 });
  observador.observe(dom.mapaObra);
}

function renderZonaActiva() {
  visorCasa3D?.actualizarPines();
  renderRespuestaZona();
}

function renderRespuestaZona() {
  const zona = zonaDePerfil(zonaMostrada());
  if (!zona) {
    dom.mapaRespuesta.innerHTML = `
      <p class="font-semibold text-navy">Arrastra la casa para girarla en 3D o toca un pin (1 al 7).</p>
      <p class="mt-1 text-base text-slate-700">Te mostramos qué perfil va en esa zona, qué problema resuelve y su desarrollo estándar.</p>`;
    return;
  }
  const perfil = obtenerPerfil(zona.perfilId);
  const cmD = calcularDesarrollo(ladosPorDefecto(perfil.id));
  dom.mapaRespuesta.innerHTML = `
    <div class="flex gap-4">
      <span class="hidden h-[4.5rem] w-24 shrink-0 rounded-md bg-steel p-1.5 ring-1 ring-slate-700 sm:block">
        ${dibujarPerfil(perfil, ladosPorDefecto(perfil.id), { tema: "oscuro", mini: true, ancho: 96, alto: 64 })}
      </span>
      <div class="min-w-0">
        <p class="text-base font-semibold text-slate-600">Para esta zona necesitas:</p>
        <p class="mt-0.5 text-lg font-extrabold leading-tight text-navy">${perfil.nombre}</p>
        <p class="mt-1 text-lg leading-snug text-slate-700">${zona.problema}</p>
      </div>
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p class="text-base text-slate-700">CM.D estándar <span class="measure text-lg font-extrabold text-amber-800">${formatoNumero(cmD)} cm</span></p>
      <button type="button" class="btn-primary" data-action="cotizar-zona" data-perfil="${perfil.id}">Configurar esta pieza con mis medidas ${icono("flecha")}</button>
    </div>`;
}

export function seleccionarZona(perfilId, { enfocar3D = true } = {}) {
  clearTimeout(temporizadorZona);
  if (!zonaDePerfil(perfilId)) return;
  const cambia = zonaMostrada() !== perfilId;
  ui.zona = perfilId;
  ui.zonaPrevia = null;
  if (enfocar3D) visorCasa3D?.enfocarZona(perfilId);
  if (cambia) renderZonaActiva();
}

function previsualizarZona(perfilId) {
  ui.zonaPrevia = perfilId === ui.zona ? null : perfilId;
  renderZonaActiva();
}

export function irAlMapa() {
  desplazarHasta(dom.mapaObra, "nearest");
  resaltar(dom.mapaObra);
}

export function cotizarZona(perfilId) {
  cargarPerfil(perfilId);
  enfocarPrimerLado();
  mostrarToast(`${obtenerPerfil(perfilId).nombre} cargado en la mesa`, "Ajusta las medidas y ángulos de cada lado.", "info");
}

export function conectarEventosMapa() {
  dom.mapaObra.addEventListener("mouseover", (evento) => {
    const pin = evento.target.closest("button[data-zona]");
    if (!pin) return;
    clearTimeout(temporizadorZona);
    const destino = pin.dataset.zona;
    if (destino !== zonaMostrada()) temporizadorZona = setTimeout(() => previsualizarZona(destino), 120);
  });

  dom.mapaObra.addEventListener("mouseleave", () => {
    clearTimeout(temporizadorZona);
    if (ui.zona && zonaMostrada() !== ui.zona) previsualizarZona(ui.zona);
  });

  dom.mapaObra.addEventListener("focusin", (evento) => {
    const perfilId = evento.target.closest("button[data-zona]")?.dataset.zona;
    if (perfilId) seleccionarZona(perfilId, { enfocar3D: true });
  });
}
