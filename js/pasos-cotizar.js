// Flujo de hojalatería en 4 pasos: Medidas, Mi lista, Mis datos y Lista (sin precios).
import { obtenerPerfil } from "./perfiles.js?v=3";
import { formatoNumero } from "./cotizador.js?v=3";
import { state, ui } from "./estado.js?v=3";
import { guardarMesa } from "./mesa-estado.js?v=3";
import { mostrarToast } from "./interfaz.js?v=3";
import { escaparHtml } from "./utils.js?v=3";
import { activarReveal, marcarCambio } from "./vida.js?v=3";

const PASOS = [
  { id: "medidas", numero: "1", nombre: "Medidas" },
  { id: "cotizacion", numero: "2", nombre: "Mi lista" },
  { id: "datos", numero: "3", nombre: "Mis datos" },
  { id: "lista", numero: "4", nombre: "Lista" },
];

const TRAZO = 'fill="none" stroke="#1E293B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';
const AGUA = 'fill="none" stroke="#D97706" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';

function dibujo(contenido) {
  return `<svg viewBox="0 0 320 180" class="aspect-video h-auto w-full" aria-hidden="true" focusable="false"><rect width="320" height="180" fill="#F8FAFC"/>${contenido}</svg>`;
}

const PREGUNTAS = [
  {
    id: "borde",
    texto: "Se rebalsa el agua en el borde del techo",
    dibujo: dibujo(`<path ${TRAZO} d="M36 96 160 40l124 56"/><path ${TRAZO} d="M48 100h224v22H48z"/><path ${AGUA} d="M72 122c10 16 10 26 0 40M160 122c10 16 10 26 0 40M248 122c10 16 10 26 0 40"/>`),
    perfilId: "canaleta",
    detalle: "Esa agua se recoge con una canaleta.",
  },
  {
    id: "cresta",
    texto: "Entra agua por la parte más alta del techo",
    dibujo: dibujo(`<path ${TRAZO} d="M28 136 142 48"/><path ${TRAZO} d="M178 48 292 136"/><path ${AGUA} d="M160 44v36M146 96c8 14 20 14 28 0"/>`),
    perfilId: "cumbrera",
    detalle: "Esa zona se cierra con una cumbrera.",
  },
  {
    id: "alero",
    texto: "Gotea o se moja el borde del alero",
    dibujo: dibujo(`<path ${TRAZO} d="M28 72h168l88 40"/><path ${TRAZO} d="M28 72v48h156"/><path ${AGUA} d="M252 118c12 18 12 30 0 46"/><circle cx="252" cy="168" r="5" fill="#D97706"/>`),
    perfilId: "cortagotera",
    detalle: "El borde del alero se protege con una cortagotera.",
  },
  {
    id: "ventana",
    texto: "Alrededor de una ventana o puerta",
    dibujo: dibujo(`<rect x="78" y="36" width="120" height="100" ${TRAZO}/><path ${TRAZO} d="M78 86h120M138 36v100"/><path ${AGUA} d="M214 48v72c0 18-18 18-32 18"/>`),
    perfilId: "perfil_j",
    detalle: "El remate de ventanas y puertas es un perfil J.",
  },
  {
    id: "esquina",
    texto: "En la esquina del muro",
    dibujo: dibujo(`<path ${TRAZO} d="M36 56 118 32v116L36 128Z"/><path ${TRAZO} d="M118 32h150v116H118Z"/><path stroke="#D97706" stroke-width="8" stroke-linecap="round" d="M118 32v116"/>`),
    perfilId: "esquinero",
    detalle: "Las esquinas verticales se cubren con un esquinero.",
  },
  {
    id: "encuentro",
    texto: "Donde el muro se junta con el techo",
    dibujo: dibujo(`<path ${TRAZO} d="M40 150V72h88"/><path ${TRAZO} d="M128 72 284 36"/><path ${AGUA} d="M116 96V58h36"/>`),
    perfilId: "perfil_l",
    detalle: "Ese encuentro se remata con un perfil L.",
  },
  {
    id: "muro",
    texto: "En la parte de abajo del muro",
    dibujo: dibujo(`<path ${TRAZO} d="M70 28h180v96H70Z"/><path ${TRAZO} d="M40 152h240"/><path stroke="#D97706" stroke-width="8" stroke-linecap="round" d="M70 124h180"/>`),
    perfilId: "inicio",
    detalle: "El arranque del revestimiento usa un perfil de inicio.",
  },
  {
    id: "ninguna",
    texto: "Ninguna se parece a la mía",
    dibujo: dibujo(`<path ${TRAZO} stroke-dasharray="10 8" d="M40 124 108 72h64l36 28"/><text x="214" y="128" fill="#D97706" font-size="84" font-family="sans-serif" font-weight="700">?</text>`),
    perfilId: null,
    detalle: "Pide una pieza especial indicando tus medidas y ángulos.",
  },
];

let pasoActual = "medidas";
let folioListo = false;

function problemaPorId(id) {
  return PREGUNTAS.find((pregunta) => pregunta.id === id) || null;
}

export function renderPreguntas() {
  const lista = document.querySelector("#no-se-opciones");
  if (!lista) return;
  lista.innerHTML = PREGUNTAS.map((pregunta) => `
    <button type="button" data-reveal class="grid min-h-12 w-full overflow-hidden rounded-lg border border-slate-300 bg-white text-left text-lg text-navy hover:border-accent" data-action="elegir-problema" data-problema="${pregunta.id}">
      <span class="relative block">
        ${pregunta.dibujo}
        <span class="absolute left-3 top-3 rounded-md bg-white px-2 py-1 text-base font-bold text-navy ring-1 ring-slate-300">Dibujo</span>
      </span>
      <span class="px-4 py-3">${escaparHtml(pregunta.texto)}</span>
    </button>`).join("");
  activarReveal(lista);
}

export function elegirProblema(id) {
  const pregunta = problemaPorId(id);
  const resultado = document.querySelector("#no-se-resultado");
  if (!pregunta || !resultado) return;
  document.querySelector("#no-se-nombre").textContent = pregunta.perfilId
    ? obtenerPerfil(pregunta.perfilId).nombre
    : "Pieza especial";
  document.querySelector("#no-se-detalle").textContent = pregunta.detalle;
  const boton = document.querySelector("#no-se-cotizar");
  boton.textContent = pregunta.perfilId ? `Configurar ${obtenerPerfil(pregunta.perfilId).nombre}` : "Pedir pieza especial";
  boton.dataset.perfil = pregunta.perfilId || "";
  boton.dataset.especial = pregunta.perfilId ? "0" : "1";
  boton.disabled = false;
  resultado.hidden = false;
  resultado.focus();
}

export function abrirNoSe() {
  const panel = document.querySelector("#no-se");
  if (!panel) return;
  if (!document.querySelector("#no-se-opciones button")) renderPreguntas();
  mostrarPaso("medidas");
  panel.showModal();
}

export function mostrarPaso(paso, { desplazar = true, enfocar = true, avisar = true } = {}) {
  if (!PASOS.some((item) => item.id === paso)) return;
  if (paso === "datos" && state.carrito.length === 0) {
    if (avisar) mostrarToast("Tu lista está vacía", "Agrega una pieza en Medidas antes de continuar.", "alerta");
    paso = "cotizacion";
  }
  if (paso === "lista" && !folioListo) {
    if (avisar) mostrarToast("Todavía no hay orden guardada", "Completa tus datos y guarda el resumen para verlo aquí.", "alerta");
    return;
  }
  pasoActual = paso;
  const indiceActual = PASOS.findIndex((item) => item.id === paso);
  document.querySelector("#pasos-barra")?.style.setProperty("--paso", String(Math.max(indiceActual, 0)));
  PASOS.forEach((item, indice) => {
    const panel = document.querySelector(`#paso-${item.id}`);
    const boton = document.querySelector(`[data-paso="${item.id}"]`);
    const activo = item.id === paso;
    if (panel) panel.hidden = !activo;
    if (boton) {
      boton.setAttribute("aria-current", activo ? "step" : "false");
      boton.dataset.estado = indice < indiceActual ? "hecho" : activo ? "actual" : "pendiente";
    }
  });
  const titulo = document.querySelector(`#paso-${paso} h2, #paso-${paso} h3`);
  if (enfocar && titulo) {
    titulo.setAttribute("tabindex", "-1");
    titulo.focus({ preventScroll: true });
  }
  if (desplazar) {
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector("#cotizador")?.scrollIntoView({ behavior: suave ? "smooth" : "instant", block: "start" });
  }
  ui.paso = pasoActual;
  guardarMesa(ui);
}

export function marcarCotizacionLista(cotizacion, opciones) {
  const datos = typeof cotizacion === "string" ? { folio: cotizacion } : cotizacion || {};
  const folio = datos.folio || "";
  folioListo = Boolean(folio);
  const nodo = document.querySelector("#lista-folio");
  const enlace = document.querySelector("#lista-pdf");
  const total = document.querySelector("#lista-total");
  const vista = document.querySelector("#lista-vista-items");
  const resumenFolio = document.querySelector("#resumen-folio");
  const resumenPdf = document.querySelector("#resumen-pdf");
  if (nodo) nodo.textContent = folio || "—";
  if (enlace && folio) enlace.href = `cotizacion.html?folio=${encodeURIComponent(folio)}`;
  const items = Array.isArray(datos.items) ? datos.items : [];
  const metros = items.filter((item) => item.unidad === "m").reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0);
  const textoResumen = items.length ? `${formatoNumero(metros)} Mts (${items.length} ${items.length === 1 ? "ítem" : "ítems"})` : "—";
  if (total) {
    total.textContent = textoResumen;
    marcarCambio(total);
  }
  if (vista) {
    vista.innerHTML = items.length
      ? items.map((item) => `<li>${escaparHtml(item.descripcion || "Pieza")} · ${formatoNumero(item.cantidad || 0)} ${escaparHtml(item.unidad || "m")}</li>`).join("")
      : "<li>Por confirmar</li>";
  }
  if (resumenFolio) resumenFolio.textContent = folio || "—";
  const resumenTotal = document.querySelector("#resumen-total");
  if (resumenTotal) resumenTotal.textContent = textoResumen;
  if (resumenPdf && folio) resumenPdf.href = `cotizacion.html?folio=${encodeURIComponent(folio)}`;
  ui.lista = {
    folio,
    total: textoResumen,
    items,
  };
  mostrarPaso("lista", opciones);
}

export function imprimirResumen() {
  const zona = document.querySelector("#zona-impresion");
  if (!zona) return;
  const folio = document.querySelector("#lista-folio")?.textContent?.trim() || "—";
  const total = document.querySelector("#lista-total")?.textContent?.trim() || "—";
  const items = document.querySelector("#lista-vista-items")?.innerHTML || "<li>Por confirmar</li>";
  const titulo = document.title;
  zona.innerHTML = `<article class="resumen-impreso"><h1>Orden técnica ${escaparHtml(folio)}</h1><p>Resumen: ${escaparHtml(total)}</p><ul>${items}</ul><h2>Qué sigue</h2><ol><li>Guarda o imprime este resumen técnico. Queda en este navegador.</li><li>El taller revisa las medidas, ángulos y cortes.</li><li>El retiro es en el taller, en Pje. Edmundo Lobos, Puerto Montt.</li></ol></article>`;
  document.title = `Orden ${folio} · Colegual SpA`;
  window.addEventListener("afterprint", () => {
    document.title = titulo;
    zona.innerHTML = "";
  }, { once: true });
  window.print();
}

export function pasoVisible() {
  return pasoActual;
}

export { PASOS, PREGUNTAS };
