// Catálogo educativo de perfiles (sin precios, enfocado en medidas, ángulos y desarrollo CM.D).
import { perfiles, obtenerPerfil, ladosPorDefecto, dibujarPerfil } from "./perfiles.js?v=3";
import { formatoNumero, calcularDesarrollo } from "./cotizador.js?v=3";
import { escaparHtml } from "./utils.js?v=3";
import { zonaDePerfil } from "./zonas-obra.js?v=3";
import { dom } from "./dom.js?v=3";
import { icono } from "./iconos.js?v=3";
import { activarReveal } from "./vida.js?v=3";

const ZONAS_AMPLIAS = [
  { id: "techo", nombre: "Techo", palabras: ["techo"] },
  { id: "alero", nombre: "Alero", palabras: ["alero"] },
  { id: "muro", nombre: "Muro", palabras: ["muro"] },
  { id: "vanos", nombre: "Ventanas y puertas", palabras: ["ventanas", "puertas"] },
];
const SALIDA_FILTRO_MS = 200;
let temporizadorFiltro = null;

export function precioDesde(perfilId) {
  return calcularDesarrollo(ladosPorDefecto(perfilId));
}

export function zonasAmplias(perfilId) {
  const ubicacion = (zonaDePerfil(perfilId)?.ubicacion || "").toLowerCase();
  return ZONAS_AMPLIAS.filter((zona) => zona.palabras.some((palabra) => ubicacion.includes(palabra))).map((zona) => zona.id);
}

function textoBusqueda(perfil) {
  return [perfil.id, perfil.nombre, ...(perfil.sinonimos || [])].join(" ").toLowerCase();
}

function tarjetaPerfil(perfil, posicion) {
  const lados = ladosPorDefecto(perfil.id);
  const cmD = calcularDesarrollo(lados);
  const zona = zonaDePerfil(perfil.id);
  const molde = document.querySelector("#ficha-perfil");
  const busqueda = escaparHtml(textoBusqueda(perfil));
  const cuerpo = `
        <h3 class="min-h-[2.5em] text-xl font-extrabold leading-tight text-navy">${perfil.nombre}</h3>
        ${
          zona
            ? `<p class="mt-2 flex items-start gap-1.5 self-start rounded-md bg-slate-100 px-2 py-1 text-base leading-snug text-slate-600 ring-1 ring-slate-200">
                ${icono("ubicacion", "mt-0.5 h-4 w-4 text-accent-dark")}
                <span>Dónde se instala: <span class="font-bold text-navy">${zona.ubicacion}</span></span>
              </p>`
            : ""
        }
        <p class="mt-4 flex items-baseline gap-1.5">
          <span class="text-base text-slate-600">CM.D estándar</span>
          <span class="measure text-2xl font-extrabold text-navy">${formatoNumero(cmD)} cm</span>
        </p>
        <p class="measure mt-1 text-base text-slate-600">Medidas de referencia: ${lados.map((cm) => formatoNumero(cm)).join(" + ")} = <span class="font-bold text-accent-dark">${formatoNumero(cmD)} cm</span></p>
        <p class="mt-1 text-base text-slate-600">Ángulos base: ${perfil.lados.map((lado) => `${lado.angulo}°`).join(" · ")}</p>
        <p class="text-base text-slate-600">Espesores: 0,4 mm y 0,5 mm.</p>
        <details class="catalogo-uso mt-4 rounded-lg border border-amber-200 bg-amber-50"${posicion === 0 ? " open" : ""}>
          <summary class="flex min-h-12 cursor-pointer items-center justify-between gap-2 px-3 text-base font-bold text-ink">
            ¿Para qué sirve?${icono("flecha", "catalogo-uso-flecha h-5 w-5 rotate-90 text-accent-dark")}
          </summary>
          <p class="px-3 pb-3 text-lg leading-relaxed text-amber-950">${perfil.tip}</p>
        </details>
        <div class="mt-auto flex flex-col gap-2 pt-4">
          <button type="button" class="btn-dark w-full" data-action="cargar-perfil" data-perfil="${perfil.id}">Cargar en mesa</button>
          <button type="button" class="btn-outline w-full" data-action="ver-detalle-pieza" data-perfil="${perfil.id}">Ver detalle</button>
        </div>`;
  if (!molde) {
    return `<article data-reveal data-zonas="${zonasAmplias(perfil.id).join(" ")}" data-busqueda="${busqueda}" class="card card-vida group flex flex-col"><div class="catalogo-lamina h-52 overflow-hidden rounded-t-xl border-b border-slate-200 bg-slate-50 px-2 py-1">${dibujarPerfil(perfil, lados, { tema: "claro", ancho: 320, alto: 200, compacto: true, trazar: true, grilla: false })}</div><div class="flex flex-1 flex-col p-5">${cuerpo}</div></article>`;
  }
  const nodo = molde.content.firstElementChild.cloneNode(true);
  nodo.dataset.reveal = "";
  nodo.dataset.zonas = zonasAmplias(perfil.id).join(" ");
  nodo.dataset.busqueda = textoBusqueda(perfil);
  nodo.querySelector(".catalogo-lamina").innerHTML = dibujarPerfil(perfil, lados, { tema: "claro", ancho: 320, alto: 200, compacto: true, trazar: true, grilla: false });
  nodo.querySelector(".ficha-cuerpo").innerHTML = cuerpo;
  return nodo.outerHTML;
}

function tarjetaEspecial() {
  return `
    <article data-reveal class="card bg-grid-light flex flex-col border-2 border-dashed border-amber-400 p-5">
      <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-accent-dark ring-1 ring-amber-300">${icono("escuadra", "h-7 w-7")}</span>
      <h3 class="mt-3 text-xl font-extrabold text-navy">Pieza especial</h3>
      <p class="mt-2 flex-1 text-lg text-slate-700">Otra forma, otro ángulo o una medida que no está en el catálogo.</p>
      <button type="button" class="btn-primary mt-4 w-full" data-action="abrir-especial">Pedir pieza especial</button>
    </article>`;
}

function renderFiltros() {
  const contenedor = document.querySelector("#catalogo-filtros");
  if (!contenedor) return;
  const usadas = new Set(perfiles.flatMap((perfil) => zonasAmplias(perfil.id)));
  const chips = [{ id: "todas", nombre: "Todas" }, ...ZONAS_AMPLIAS.filter((zona) => usadas.has(zona.id))];
  contenedor.innerHTML = chips
    .map((zona) => `<button type="button" class="chip" data-action="filtrar-catalogo" data-zona="${zona.id}" aria-pressed="${zona.id === "todas"}">${zona.nombre}</button>`)
    .join("");
}

function engancharBusqueda() {
  const campo = document.querySelector("#catalogo-buscar");
  if (!campo || campo.dataset.listo) return;
  campo.dataset.listo = "1";
  campo.addEventListener("input", () => filtrarCatalogo());
}

export function renderCatalogo() {
  dom.catalogoGrid.removeAttribute("aria-busy");
  dom.catalogoGrid.innerHTML = perfiles.map((perfil, posicion) => tarjetaPerfil(perfil, posicion)).join("") + tarjetaEspecial();
  renderFiltros();
  engancharBusqueda();
  activarReveal(dom.catalogoGrid);
  trazarFichas();
  filtrarCatalogo();
}

export function programarCatalogo() {
  const grid = dom.catalogoGrid;
  if (!grid || grid.dataset.programado === "1") return;
  const seccion = document.querySelector("#catalogo");
  const pintar = () => {
    if (grid.dataset.programado === "1") return;
    grid.dataset.programado = "1";
    pintarCatalogo(grid);
  };
  if (!seccion || typeof IntersectionObserver !== "function" || seccion.getBoundingClientRect().top < window.innerHeight) {
    pintar();
    return;
  }
  const observador = new IntersectionObserver((entradas) => {
    if (!entradas.some((entrada) => entrada.isIntersecting)) return;
    observador.disconnect();
    pintar();
  });
  observador.observe(seccion);
}

function pintarCatalogo(grid) {
  grid.setAttribute("aria-busy", "true");
  grid.innerHTML = "";
  engancharBusqueda();
  const trabajos = perfiles.map((perfil, posicion) => () => tarjetaPerfil(perfil, posicion));
  trabajos.push(tarjetaEspecial);
  let indice = 0;
  function lote(margen) {
    const inicio = performance.now();
    let html = "";
    while (indice < trabajos.length && performance.now() - inicio < 32) {
      if (margen && margen.timeRemaining && margen.timeRemaining() < 6 && html) break;
      html += trabajos[indice]();
      indice += 1;
    }
    if (html) grid.insertAdjacentHTML("beforeend", html);
    if ((document.querySelector("#catalogo-buscar")?.value || "").trim()) filtrarCatalogo();
    if (indice < trabajos.length) {
      pedirHueco(lote);
      return;
    }
    grid.removeAttribute("aria-busy");
    renderFiltros();
    activarReveal(grid);
    trazarFichas();
    filtrarCatalogo();
  }
  pedirHueco(lote);
}

function pedirHueco(fn) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 200 });
  else setTimeout(() => fn(null), 0);
}

function trazarFichas() {
  const laminas = [...document.querySelectorAll(".catalogo-lamina")];
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add("is-trazado");
      observador.unobserve(entrada.target);
    });
  }, { threshold: 0.35 });
  laminas.forEach((lamina) => observador.observe(lamina));
}

export function filtrarCatalogo(zonaId) {
  const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (zonaId) {
    document.querySelectorAll("#catalogo-filtros .chip").forEach((chip) => chip.setAttribute("aria-pressed", String(chip.dataset.zona === zonaId)));
  }
  const zonaActiva = document.querySelector('#catalogo-filtros .chip[aria-pressed="true"]')?.dataset.zona || zonaId || "todas";
  const texto = (document.querySelector("#catalogo-buscar")?.value || "").trim().toLowerCase();
  const tarjetas = [...dom.catalogoGrid.querySelectorAll("article[data-zonas]")];
  const quedan = tarjetas.filter((tarjeta) => {
    const zonaOk = zonaActiva === "todas" || tarjeta.dataset.zonas.split(" ").includes(zonaActiva);
    if (!zonaOk) return false;
    if (!texto) return true;
    return (tarjeta.dataset.busqueda || "").includes(texto);
  });
  const antes = sinMovimiento ? null : new Map(quedan.map((tarjeta) => [tarjeta, tarjeta.getBoundingClientRect()]));
  clearTimeout(temporizadorFiltro);
  tarjetas.forEach((tarjeta) => {
    const queda = quedan.includes(tarjeta);
    if (queda) {
      tarjeta.hidden = false;
      requestAnimationFrame(() => tarjeta.classList.remove("is-filtrada"));
    } else {
      tarjeta.classList.add("is-filtrada");
    }
  });
  temporizadorFiltro = setTimeout(() => {
    tarjetas.forEach((tarjeta) => { if (!quedan.includes(tarjeta)) tarjeta.hidden = true; });
    if (!antes) return;
    quedan.forEach((tarjeta) => {
      const origen = antes.get(tarjeta);
      const destino = tarjeta.getBoundingClientRect();
      const dx = origen.left - destino.left;
      const dy = origen.top - destino.top;
      if (!dx && !dy) return;
      tarjeta.style.transition = "none";
      tarjeta.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        tarjeta.style.transition = "transform .25s ease-out";
        tarjeta.style.transform = "";
      });
    });
  }, sinMovimiento ? 0 : SALIDA_FILTRO_MS);
  const zona = ZONAS_AMPLIAS.find((actual) => actual.id === zonaActiva);
  const conteo = document.querySelector("#catalogo-conteo");
  if (conteo) {
    conteo.textContent = texto && quedan.length === 0
      ? "0 piezas"
      : `${quedan.length} ${quedan.length === 1 ? "pieza" : "piezas"}${zona ? ` para ${zona.nombre.toLowerCase()}` : ""}, más la pieza especial.`;
  }
}

export function renderCatalogoCargando(cantidad = 6) {
  dom.catalogoGrid.setAttribute("aria-busy", "true");
  dom.catalogoGrid.innerHTML = Array.from({ length: cantidad }, () => `
    <article class="card skel overflow-hidden" aria-hidden="true">
      <div class="skel-box h-52 rounded-none"></div>
      <div class="space-y-3 p-5"><div class="skel-line h-4 w-3/4"></div><div class="skel-line h-4 w-1/2"></div><div class="skel-line h-12"></div></div>
    </article>`).join("");
}

export function renderCatalogoVacio() {
  dom.catalogoGrid.removeAttribute("aria-busy");
  dom.catalogoGrid.innerHTML = `
    <div class="card col-span-full flex flex-col items-center gap-4 p-10 text-center">
      <svg viewBox="0 0 120 60" class="h-20 w-40 text-accent" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 10v30a10 10 0 0 0 10 10h90a10 10 0 0 0 10-10V10"/></svg>
      <h3 class="text-2xl font-extrabold text-navy">El catálogo se muestra al ingresar</h3>
      <p class="max-w-prose text-lg text-slate-700">Ingresa con tu correo para ver las piezas. También puedes pedir una pieza especial.</p>
      <div class="flex flex-wrap justify-center gap-3">
        <button type="button" class="btn-dark" data-action="abrir-auth">Ingresar</button>
        <button type="button" class="btn-primary" data-action="abrir-especial">Pedir pieza especial</button>
      </div>
    </div>`;
}

export function abrirDetallePieza(perfilId) {
  const dialogo = document.querySelector("#detalle-pieza");
  const perfil = obtenerPerfil(perfilId);
  if (!dialogo || !perfil) return;
  const lados = ladosPorDefecto(perfil.id);
  const zona = zonaDePerfil(perfil.id);
  dialogo.innerHTML = `
    <div class="flex flex-col gap-5 p-5 sm:p-8">
      <header class="flex items-start justify-between gap-4">
        <div>
          <p class="eyebrow-light text-base">Detalle de la pieza</p>
          <h2 id="detalle-pieza-titulo" class="mt-1 text-3xl font-extrabold text-navy">${escaparHtml(perfil.nombre)}</h2>
        </div>
        <button type="button" class="btn-outline min-w-12 px-3" data-action="cerrar-detalle-pieza" aria-label="Cerrar el detalle">✕</button>
      </header>
      <div class="catalogo-lamina aspect-[8/5] w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2">
        ${dibujarPerfil(perfil, lados, { tema: "claro", ancho: 640, alto: 400, mostrarAngulo: true })}
      </div>
      <div class="grid gap-5 md:grid-cols-2">
        <section aria-labelledby="detalle-lados">
          <h3 id="detalle-lados" class="text-xl font-extrabold text-navy">Lados y ángulos de la pieza</h3>
          <ol class="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
            ${perfil.lados.map((lado) => `<li class="flex min-h-12 items-center justify-between gap-3 px-3 text-lg"><span><span class="measure font-bold text-accent-dark">${lado.letra}</span> ${escaparHtml(lado.nombre)}</span><span class="measure">${formatoNumero(lado.cm)} cm · ${lado.angulo}°</span></li>`).join("")}
          </ol>
          <p class="mt-2 text-lg">Desarrollo (<span class="measure">CM.D</span>): <span class="measure font-bold text-navy">${formatoNumero(calcularDesarrollo(lados))} cm</span></p>
        </section>
        <section class="space-y-4" aria-label="Uso e instalación">
          ${zona ? `<p class="flex items-start gap-2 text-lg">${icono("ubicacion", "mt-1 h-5 w-5 text-accent-dark")}<span>Dónde se instala: <span class="font-bold text-navy">${escaparHtml(zona.ubicacion)}</span></span></p>` : ""}
          <p class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-lg leading-relaxed text-amber-950">${perfil.tip}</p>
          <p class="text-base text-slate-600">Puedes personalizar las medidas y ángulos de cada lado en la mesa de configuración.</p>
        </section>
      </div>
      <footer class="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
        <button type="button" class="btn-outline" data-action="cerrar-detalle-pieza">Cerrar</button>
        <button type="button" class="btn-primary" data-action="cargar-perfil" data-perfil="${perfil.id}">Cargar esta pieza en mesa</button>
      </footer>
    </div>`;
  dialogo.showModal();
}
