// Panel del taller: consolidado de compra por lote, kanban de producción y ficha de corte.
import { etapas } from "./demo/mockData.js?v=3";
import {
  plancha,
  tarifas,
  formatoClp,
  formatoNumero,
  obtenerMaterial,
  nombreMaterial,
  calcularTiras,
  describirTiras,
} from "./cotizador.js?v=3";
import { obtenerPerfil, dibujarPerfil } from "./perfiles.js?v=3";
import { escaparHtml } from "./utils.js?v=3";
import { icono } from "./iconos.js?v=3";

const estiloEtapa = {
  recoleccion: {
    borde: "border-t-amber-500",
    cabecera: "bg-amber-50",
    punto: "bg-amber-500",
    numero: "text-navy",
    texto: "text-amber-400",
    accion: "Mover a Material en Taller",
  },
  material: {
    borde: "border-t-slate-400",
    cabecera: "bg-slate-100",
    punto: "bg-slate-400",
    numero: "text-navy",
    texto: "text-slate-300",
    accion: "Pasar a Corte y Plegado",
  },
  corte: {
    borde: "border-t-blue-500",
    cabecera: "bg-blue-50",
    punto: "bg-blue-800",
    numero: "text-white",
    texto: "text-blue-400",
    accion: "Marcar Listo para Retiro",
  },
  listo: {
    borde: "border-t-emerald-500",
    cabecera: "bg-emerald-50",
    punto: "bg-emerald-500",
    numero: "text-navy",
    texto: "text-emerald-400",
    accion: "Entregado al cliente",
  },
};

/**
 * Empaqueta tiras (ancho = CM.D) en planchas de 122 cm: cada plancha se llena con la
 * combinación de tiras pendientes que más ancho aprovecha (subset-sum en décimas de cm).
 */
function empaquetarTiras(anchos) {
  const escala = 10;
  const capacidad = plancha.anchoCm * escala;
  let pendientes = anchos.map((ancho) => Math.round(ancho * escala)).filter((ancho) => ancho > 0);
  const planchas = [];

  while (pendientes.length) {
    const quien = new Array(capacidad + 1).fill(-1);
    quien[0] = Number.POSITIVE_INFINITY;
    pendientes.forEach((ancho, indice) => {
      for (let suma = capacidad; suma >= ancho; suma -= 1) {
        if (quien[suma] === -1 && quien[suma - ancho] !== -1) quien[suma] = indice;
      }
    });

    let mejor = capacidad;
    while (mejor > 0 && quien[mejor] === -1) mejor -= 1;
    if (mejor === 0) {
      // Tira más ancha que la plancha: va sola (la validación del cotizador lo impide).
      planchas.push({ libre: 0, tiras: [pendientes[0] / escala] });
      pendientes = pendientes.slice(1);
      continue;
    }

    const usadas = new Set();
    for (let suma = mejor; suma > 0; suma -= pendientes[quien[suma]]) usadas.add(quien[suma]);
    planchas.push({
      libre: (capacidad - mejor) / escala,
      tiras: [...usadas].map((indice) => pendientes[indice] / escala),
    });
    pendientes = pendientes.filter((_, indice) => !usadas.has(indice));
  }
  return planchas;
}

function consolidarLote(pedidos) {
  const enLote = pedidos.filter((pedido) => pedido.etapa === "recoleccion");
  const porEspesor = Object.fromEntries(Object.keys(tarifas).map((espesor) => [espesor, new Map()]));
  const moldes = [];

  enLote.forEach((pedido) => {
    pedido.items.forEach((linea) => {
      const grupos = porEspesor[linea.espesor];
      const grupo = grupos.get(linea.materialId) ?? { materialId: linea.materialId, metros: 0, anchos: [], completas: 0, cortas: 0 };
      grupo.metros += linea.metros;
      const corte = calcularTiras(linea.metros);
      grupo.completas += corte.completas;
      grupo.cortas += corte.resto > 0 ? 1 : 0;
      for (let indice = 0; indice < corte.total; indice += 1) grupo.anchos.push(linea.cmD);
      grupos.set(linea.materialId, grupo);
      if (linea.molde) {
        moldes.push({
          folio: pedido.folio,
          cliente: pedido.cliente,
          perfil: linea.nombre,
          cmD: linea.cmD,
          espesor: linea.espesor,
          materialId: linea.materialId,
        });
      }
    });
  });

  const espesores = Object.entries(porEspesor).map(([espesor, grupos]) => {
    const filas = [...grupos.values()].map((grupo) => {
      const planchas = empaquetarTiras(grupo.anchos).length;
      const anchoUsado = grupo.anchos.reduce((suma, ancho) => suma + ancho, 0);
      return {
        ...grupo,
        tiras: grupo.anchos.length,
        planchas,
        aprovechamiento: planchas ? anchoUsado / (planchas * plancha.anchoCm) : 0,
        anchoUsado,
      };
    });
    const planchas = filas.reduce((suma, fila) => suma + fila.planchas, 0);
    const anchoUsado = filas.reduce((suma, fila) => suma + fila.anchoUsado, 0);
    return {
      espesor,
      filas,
      metros: filas.reduce((suma, fila) => suma + fila.metros, 0),
      tiras: filas.reduce((suma, fila) => suma + fila.tiras, 0),
      planchas,
      aprovechamiento: planchas ? anchoUsado / (planchas * plancha.anchoCm) : 0,
    };
  });

  return {
    pedidos: enLote,
    espesores,
    moldes,
    metros: espesores.reduce((suma, actual) => suma + actual.metros, 0),
    planchas: espesores.reduce((suma, actual) => suma + actual.planchas, 0),
    monto: enLote.reduce((suma, pedido) => suma + pedido.total, 0),
  };
}

function renderTarjetaEspesor(resumen) {
  const filas = resumen.filas.length
    ? resumen.filas
        .map((fila) => {
          const material = obtenerMaterial(fila.materialId);
          return `
            <li class="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2">
              <span class="flex min-w-0 items-center gap-2 text-lg text-slate-800">
                <span class="h-3.5 w-3.5 shrink-0 rounded-sm ring-1 ring-slate-300" style="background:${material.muestra}"></span>
                <span class="truncate" title="${escaparHtml(nombreMaterial(fila.materialId))}">${escaparHtml(material.tipo === "Zincalum" ? material.tipo : material.color)}</span>
              </span>
              <span class="measure text-base text-slate-600">${formatoNumero(fila.metros)} ml · ${fila.tiras} tiras</span>
              <span class="measure text-lg font-bold text-navy">${fila.planchas} pl.</span>
            </li>`;
        })
        .join("")
    : `<li class="py-3 text-lg text-slate-600">Sin pedidos de este espesor en el lote.</li>`;

  return `
    <article class="flex flex-col rounded-xl border border-slate-300 bg-white p-5 text-ink">
      <header class="flex items-start justify-between gap-3">
        <div>
          <p class="text-base font-bold uppercase tracking-wide text-amber-800">Plancha ${resumen.espesor} mm</p>
          <p class="mt-2 flex items-baseline gap-2">
            <span class="measure text-5xl font-extrabold text-navy">${resumen.planchas}</span>
            <span class="text-lg text-slate-600">planchas<br><span class="measure text-base">${plancha.anchoCm} × ${plancha.largoM * 100} cm</span></span>
          </p>
        </div>
        <span class="badge text-base bg-slate-100 font-mono text-navy ring-1 ring-slate-300">${resumen.espesor} mm</span>
      </header>
      <dl class="mt-4 grid grid-cols-3 gap-2 text-center">
        <div class="rounded-md bg-slate-50 px-2 py-2">
          <dt class="text-base uppercase tracking-wide text-slate-600">Metros lin.</dt>
          <dd class="measure text-base font-bold text-navy">${formatoNumero(resumen.metros)}</dd>
        </div>
        <div class="rounded-md bg-slate-50 px-2 py-2">
          <dt class="text-base uppercase tracking-wide text-slate-600">Tiras 3 m</dt>
          <dd class="measure text-base font-bold text-navy">${resumen.tiras}</dd>
        </div>
        <div class="rounded-md bg-slate-50 px-2 py-2">
          <dt class="text-base uppercase tracking-wide text-slate-600">Aprovech.</dt>
          <dd class="measure text-base font-bold ${resumen.aprovechamiento >= 0.8 ? "text-emerald-800" : "text-amber-800"}">${Math.round(resumen.aprovechamiento * 100)}%</dd>
        </div>
      </dl>
      <ul class="mt-3 divide-y divide-slate-200 border-t border-slate-200">${filas}</ul>
    </article>`;
}

function renderTarjetaCarton(moldes) {
  const filas = moldes.length
    ? moldes
        .map(
          (molde) => `
            <li class="flex items-center justify-between gap-3 py-2 text-lg">
              <span class="min-w-0 truncate text-slate-800"><span class="measure text-base text-slate-600">${molde.folio}</span> ${escaparHtml(molde.perfil)}</span>
              <span class="measure shrink-0 font-bold text-navy">${formatoNumero(molde.cmD)} cm</span>
            </li>`
        )
        .join("")
    : `<li class="py-3 text-lg text-slate-600">Ningún pedido del lote pidió molde.</li>`;

  return `
    <article class="flex flex-col rounded-xl border border-slate-300 bg-white p-5 text-ink">
      <header>
        <p class="text-base font-bold uppercase tracking-wide text-amber-800">Moldes de cartón</p>
        <p class="mt-2 flex items-baseline gap-2">
          <span class="measure text-5xl font-extrabold text-navy">${moldes.length}</span>
          <span class="text-lg text-slate-600">moldes<br><span class="text-base">a trazar en cartón</span></span>
        </p>
      </header>
      <p class="mt-4 rounded-md bg-slate-50 px-3 py-2 text-base text-slate-700">
        Ancho total de plantillas: <span class="measure font-bold text-navy">${formatoNumero(moldes.reduce((suma, molde) => suma + molde.cmD, 0))} cm</span>
      </p>
      <ul class="mt-3 divide-y divide-slate-200 border-t border-slate-200">${filas}</ul>
    </article>`;
}

function filasCompra(consolidado) {
  return consolidado.espesores.flatMap((resumen) =>
    resumen.filas.map((fila) => ({
      espesor: resumen.espesor,
      material: nombreMaterial(fila.materialId),
      completas: fila.completas || 0,
      cortas: fila.cortas || 0,
      planchas: fila.planchas,
      moldes: consolidado.moldes.filter((molde) => molde.espesor === resumen.espesor && molde.materialId === fila.materialId).length,
    }))
  );
}

function renderLote({ numeroLote, consolidado }) {
  const sinPedidos = consolidado.pedidos.length === 0;
  const filas = filasCompra(consolidado);
  return `
    <article class="rounded-xl border border-slate-300 bg-white p-5 text-ink">
      <p class="text-base font-bold uppercase tracking-wide text-amber-800">Demostración · Lote N° ${numeroLote}</p>
      <h3 class="mt-1 text-2xl font-extrabold text-navy">Lote de compra</h3>
      <p class="mt-1 text-lg text-slate-700">Material para los pedidos en «Recolección». Cuándo cierra el lote: por confirmar.</p>
      <div class="mt-4 max-h-[32rem] overflow-auto">
        <table class="tabla-taller w-full text-left text-lg sm:min-w-[40rem]">
          <thead>
            <tr class="border-b border-slate-300 text-base text-slate-600">
              <th class="py-2 pr-3 font-bold">Espesor</th>
              <th class="py-2 pr-3 font-bold">Material y color</th>
              <th class="num py-2 pr-3 font-bold">Tiras de 3 m</th>
              <th class="num py-2 pr-3 font-bold">Tiras cortas</th>
              <th class="num py-2 pr-3 font-bold">Planchas 122 × 300 cm</th>
              <th class="num py-2 font-bold">Moldes de cartón</th>
            </tr>
          </thead>
          <tbody>
            ${
              filas.length
                ? filas
                    .map(
                      (fila) => `<tr class="border-b border-slate-200">
                        <td class="measure py-3 pr-3" data-label="Espesor">${escaparHtml(fila.espesor)} mm</td>
                        <td class="py-3 pr-3" data-label="Material y color">${escaparHtml(fila.material)}</td>
                        <td class="num measure py-3 pr-3" data-label="Tiras de 3 m">${fila.completas}</td>
                        <td class="num measure py-3 pr-3" data-label="Tiras cortas">${fila.cortas}</td>
                        <td class="num measure py-3 pr-3" data-label="Planchas 122 × 300 cm">${fila.planchas}</td>
                        <td class="num measure py-3" data-label="Moldes de cartón">${fila.moldes}</td>
                      </tr>`
                    )
                    .join("")
                : `<tr><td class="py-3 text-lg" colspan="6">Sin pedidos en recolección.</td></tr>`
            }
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-base text-slate-600">Proveedor y si se separa la compra: por confirmar.</p>
      <button type="button" class="btn-primary mt-5 min-h-12 w-full text-lg" data-action="cerrar-lote" ${sinPedidos ? "disabled" : ""}>
        Cerrar lote y pasar a «Material en taller»
      </button>
    </article>`;
}

function renderConsolidado(consolidado) {
  return `${consolidado.espesores.map(renderTarjetaEspesor).join("")}${renderTarjetaCarton(consolidado.moldes)}`;
}

function renderLineaPedido(linea, modoPantalla) {
  const perfil = obtenerPerfil(linea.perfilId);
  const material = obtenerMaterial(linea.materialId);
  return `
    <li class="flex items-center gap-3 rounded-md bg-slate-50 px-2.5 py-2">
      <span class="${modoPantalla ? "h-10 w-14" : "h-8 w-11"} shrink-0 text-navy">
        ${dibujarPerfil(perfil, linea.lados.map((lado) => lado.cm), { mini: true, ancho: 72, alto: 48 })}
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate ${modoPantalla ? "text-base" : "text-lg"} font-medium text-navy">${escaparHtml(linea.nombre)}</span>
        <span class="measure flex items-center gap-1.5 ${modoPantalla ? "text-lg" : "text-base"} text-slate-600">
          <span class="h-2.5 w-2.5 rounded-sm ring-1 ring-white/20" style="background:${material.muestra}"></span>
          ${formatoNumero(linea.cmD)} cm · ${linea.espesor} mm · ${formatoNumero(linea.metros)} Mts${linea.molde ? " · molde" : ""}
        </span>
      </span>
    </li>`;
}

function renderTarjetaPedido(pedido, modoPantalla) {
  const estilo = estiloEtapa[pedido.etapa];
  const esCorte = pedido.etapa === "corte";
  const cortadas = pedido.items.filter((linea) => linea.cortada).length;
  return `
    <article class="group rounded-lg border border-slate-300 bg-white p-4 shadow-sm transition ${
      esCorte ? "cursor-pointer hover:border-amber-600" : ""
    }" ${esCorte ? `data-action="abrir-ficha" data-folio="${pedido.folio}" title="Abrir ficha de corte"` : ""}>
      <header class="flex items-center justify-between gap-2">
        <span class="measure ${modoPantalla ? "text-lg" : "text-base"} font-bold text-navy">${pedido.folio}<span class="font-medium text-slate-500"> · ${pedido.boleta ?? ""}</span></span>
        <span class="text-base text-slate-500">${escaparHtml(pedido.fecha)}</span>
      </header>
      <h4 class="mt-1.5 ${modoPantalla ? "text-xl" : "text-lg"} font-bold leading-tight text-navy">${escaparHtml(pedido.cliente)}</h4>
      <a href="tel:${escaparHtml(String(pedido.telefono).replace(/[^\d+]/g, ""))}"
        class="measure mt-1 inline-flex min-h-12 items-center text-base font-semibold text-navy underline">
        ${escaparHtml(pedido.telefono)}
      </a>
      <ul class="mt-3 space-y-1.5">${pedido.items.map((linea) => renderLineaPedido(linea, modoPantalla)).join("")}</ul>
      ${
        esCorte
          ? `<div class="mt-3 flex items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-base text-navy">
              <span>Ficha de corte</span>
              <span class="measure font-bold">${cortadas}/${pedido.items.length} piezas cortadas</span>
            </div>`
          : ""
      }
      <footer class="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
        <span class="measure ${modoPantalla ? "text-base" : "text-lg"} font-bold text-navy">${formatoNumero(pedido.items.reduce((s, l) => s + (Number(l.metros) || 0), 0))} Mts</span>
        <button type="button" class="min-h-12 btn text-base ${pedido.etapa ==="listo" ? "bg-emerald-800 hover:bg-emerald-700" : "bg-slate-700 hover:bg-slate-600"} px-3 py-1.5 text-base text-white"
          data-action="avanzar-pedido" data-folio="${pedido.folio}">
          ${estilo.accion} ${icono("flecha", "h-4 w-4")}
        </button>
      </footer>
    </article>`;
}

const tituloTablero = {
  recoleccion: "Recolección",
  material: "Material en taller",
  corte: "Corte y plegado",
  listo: "Listo para retiro",
};

function renderKanban(pedidos, { modoPantalla = false } = {}) {
  return etapas
    .map((etapa) => {
      const estilo = estiloEtapa[etapa.id];
      const tarjetas = pedidos.filter((pedido) => pedido.etapa === etapa.id);
      const titulo = tituloTablero[etapa.id] || etapa.titulo;
      return `
        <section data-reveal style="--reveal-paso:40ms" class="flex min-w-0 flex-col rounded-xl border border-slate-300 border-t-4 ${estilo.borde} bg-slate-50" aria-label="${titulo}">
          <header class="flex items-center justify-between gap-2 rounded-t-lg border-b border-slate-200 ${estilo.cabecera} px-4 py-3">
            <h3 class="text-lg font-bold text-navy">${titulo}</h3>
            <span class="measure flex h-8 min-w-8 items-center justify-center rounded-full ${estilo.punto} px-2 text-base font-bold ${estilo.numero}">${tarjetas.length}</span>
          </header>
          <div class="flex flex-1 flex-col gap-3 p-3 ${modoPantalla ? "min-h-[70vh]" : "min-h-[16rem]"}">
            ${
              tarjetas.length
                ? tarjetas.map((pedido) => renderTarjetaPedido(pedido, modoPantalla)).join("")
                : `<p class="m-auto text-center text-lg text-slate-600">Sin pedidos en esta etapa</p>`
            }
          </div>
        </section>`;
    })
    .join("");
}

function renderFicha(pedido, indice) {
  const linea = pedido.items[indice];
  const perfil = obtenerPerfil(linea.perfilId);
  const material = obtenerMaterial(linea.materialId);
  const cms = linea.lados.map((lado) => lado.cm);
  let acumulado = 0;
  const todasCortadas = pedido.items.every((actual) => actual.cortada);
  const total = pedido.items.length;
  const pliegues = linea.lados
    .map((lado, posicion) => {
      acumulado += lado.cm;
      return `
        <li class="rounded-xl border-2 border-white bg-black px-4 py-4">
          <p class="text-lg font-bold text-amber-300">${posicion + 1}. ${escaparHtml(lado.nombre)}</p>
          <p class="measure mt-1 text-4xl font-black text-white">${formatoNumero(lado.cm)} cm</p>
          <p class="measure mt-1 text-lg text-amber-200">marca a ${formatoNumero(acumulado)} cm</p>
        </li>`;
    })
    .join("");

  return `
    <div class="flex h-full flex-col">
      <div class="bg-hazard h-2 shrink-0"></div>
      <header class="flex flex-wrap items-center justify-between gap-4 border-b-4 border-white bg-black px-6 py-4 sm:px-10">
        <div>
          <p class="text-base font-bold uppercase tracking-wide text-amber-300">Demostración</p>
          <p class="measure mt-1 text-lg font-bold text-white">Pedido ${escaparHtml(pedido.folio)} · ${escaparHtml(pedido.cliente)}</p>
          <h2 class="mt-1 text-4xl font-black uppercase leading-none text-white sm:text-5xl">Ficha de corte</h2>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="measure inline-flex min-h-12 items-center rounded-lg border-2 border-white px-4 text-xl font-bold text-white">Pieza ${indice + 1} de ${total}</span>
          <button type="button" class="btn-outline-dark min-h-12 px-5 text-lg" data-action="cerrar-ficha">Volver al tablero</button>
        </div>
      </header>

      <div class="grid flex-1 gap-8 overflow-y-auto px-6 py-8 sm:px-10 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section class="flex flex-col gap-8">
          <div class="rounded-2xl border-4 border-amber-500 bg-amber-500/10 px-6 py-6">
            <p class="measure text-xl font-bold uppercase tracking-[0.2em] text-amber-300 sm:text-2xl">Desarrollo (CM.D)</p>
            <p class="measure text-7xl font-black leading-none text-amber-400 sm:text-[9rem]">${formatoNumero(linea.cmD)}<span class="text-5xl sm:text-7xl"> CM</span></p>
            <p class="measure mt-3 text-lg text-amber-200/80">Perfil: <span class="font-bold text-white">${escaparHtml(perfil.nombre)}</span></p>
          </div>

          <div>
            <p class="mb-3 text-lg font-bold uppercase tracking-[0.2em] text-white">Pliegues, paso a paso</p>
            <ol class="grid gap-3 sm:grid-cols-2">${pliegues}</ol>
            <p class="mt-4 text-lg text-white">«Marca» es la distancia desde el borde de la plancha.</p>
          </div>
        </section>

        <section class="flex flex-col gap-6">
          <div class="h-64 rounded-2xl border-2 border-slate-800 bg-slate-950 sm:h-80">
            ${dibujarPerfil(perfil, cms, { tema: "oscuro", ancho: 520, alto: 320 })}
          </div>
          <dl class="grid grid-cols-2 gap-4">
            <div class="rounded-xl border-2 border-slate-700 bg-slate-900 p-4">
              <dt class="text-base font-bold uppercase tracking-wide text-slate-400">Espesor</dt>
              <dd class="measure text-4xl font-extrabold text-white">${linea.espesor} mm</dd>
            </div>
            <div class="rounded-xl border-2 border-slate-700 bg-slate-900 p-4">
              <dt class="text-base font-bold uppercase tracking-wide text-slate-400">Metros</dt>
              <dd class="measure text-4xl font-extrabold text-white">${formatoNumero(linea.metros)} Mts</dd>
            </div>
            <div class="rounded-xl border-2 border-slate-700 bg-slate-900 p-4">
              <dt class="text-base font-bold uppercase tracking-wide text-slate-400">Material</dt>
              <dd class="mt-1 flex items-center gap-2 text-xl font-bold text-white">
                <span class="h-6 w-6 rounded ring-2 ring-white/30" style="background:${material.muestra}"></span>
                ${escaparHtml(nombreMaterial(linea.materialId))}
              </dd>
            </div>
            <div class="rounded-xl border-2 border-slate-700 bg-slate-900 p-4">
              <dt class="text-base font-bold uppercase tracking-wide text-slate-400">Tiras de plancha</dt>
              <dd class="measure mt-1 text-xl font-bold text-white">${describirTiras(linea.metros)}</dd>
            </div>
          </dl>
          ${
            linea.molde
              ? `<p class="rounded-xl border-2 border-amber-500/60 bg-amber-500/10 px-4 py-3 text-lg font-bold text-amber-300">Lleva molde de cartón</p>`
              : ""
          }
        </section>
      </div>

      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-6 py-4 sm:px-10">
        <button type="button" class="btn-outline-dark min-h-12 px-6 text-lg" data-action="ficha-anterior" ${indice === 0 ? "disabled" : ""}>Pieza anterior</button>
        <div class="flex flex-wrap items-center gap-3">
          <button type="button" class="btn min-h-12 text-lg ${linea.cortada ? "bg-amber-400 text-ink hover:bg-amber-300" : "bg-white text-ink hover:bg-slate-200"} px-6"
            data-action="marcar-cortada" aria-pressed="${linea.cortada}">
            ${linea.cortada ? "Pieza cortada" : "Marcar pieza cortada"}
          </button>
          ${
            todasCortadas
              ? `<button type="button" class="btn-success min-h-12 px-6 text-lg" data-action="ficha-listo" data-folio="${pedido.folio}">Pasar a listo para retiro</button>`
              : ""
          }
        </div>
        <button type="button" class="btn-primary min-h-12 px-6 text-lg" data-action="ficha-siguiente" ${indice === total - 1 ? "disabled" : ""}>Siguiente pieza</button>
      </footer>
    </div>`;
}

function renderSolicitudesEspeciales(solicitudes) {
  if (!solicitudes.length) {
    return '<p class="rounded-xl border border-slate-700 p-5 text-lg text-slate-400">Todavía no hay solicitudes especiales. Se mostrarán aquí cuando envíes una desde el cotizador de demostración.</p>';
  }
  return [...solicitudes].reverse().map((solicitud) => {
    const medidas = Object.entries(solicitud.medidas)
      .filter(([, valor]) => valor !== null)
      .map(([lado, valor]) => `${lado}: ${formatoNumero(valor, 2)} cm`).join(" · ");
    const material = solicitud.material === "recomendar" ? "Por recomendar" : solicitud.material === "otro" ? "Otro (ver descripción)" : nombreMaterial(solicitud.material);
    const espesor = solicitud.espesor === "recomendar" ? "Por recomendar" : solicitud.espesor === "otro" ? "Otro (ver descripción)" : `${solicitud.espesor} mm`;
    return `<article class="card-dark min-w-0 break-words p-5">
      <h3 class="font-bold text-amber-300">Cotización especial pendiente</h3>
      <p class="mt-1 text-base text-slate-400">${escaparHtml(solicitud.fecha)} · Demostración local</p>
      <p class="mt-4 whitespace-pre-wrap text-lg text-white">${escaparHtml(solicitud.descripcion)}</p>
      <dl class="mt-4 space-y-2 text-lg">
        <div><dt class="text-slate-400">Medidas aproximadas</dt><dd>${escaparHtml(medidas || "Por definir con el taller")}</dd></div>
        <div><dt class="text-slate-400">Cantidad</dt><dd>${formatoNumero(solicitud.cantidad, 2)} ${solicitud.unidad === "metros" ? "metros lineales" : "unidades"}</dd></div>
        <div><dt class="text-slate-400">Material / espesor</dt><dd>${escaparHtml(material)} / ${escaparHtml(espesor)}</dd></div>
        <div><dt class="text-slate-400">Contacto</dt><dd>${escaparHtml(solicitud.nombre)} · ${escaparHtml(solicitud.telefono)} · ${escaparHtml(solicitud.comuna)}</dd></div>
      </dl>
      <p class="mt-4 border-t border-slate-700 pt-3 text-lg text-amber-200">Pendiente de revisión técnica del taller.</p>
    </article>`;
  }).join("");
}

function renderBandeja({ solicitudes, pedidos }) {
  const especiales = solicitudes || [];
  const enRecoleccion = (pedidos || []).filter((pedido) => pedido.etapa === "recoleccion");
  const filasEspeciales = especiales.length
    ? especiales
        .map((solicitud) => {
          const material = solicitud.material === "recomendar" ? "No sé" : solicitud.material === "otro" ? "Otro" : nombreMaterial(solicitud.material);
          const espesor = solicitud.espesor === "recomendar" || solicitud.espesor === "otro" ? "No sé" : `${solicitud.espesor} mm`;
          return `<article class="rounded-lg border border-slate-300 p-4">
            <p class="text-lg font-bold text-navy">${escaparHtml(solicitud.folio || "CE")} · ${escaparHtml(solicitud.nombre)} · ${escaparHtml(solicitud.comuna)}</p>
            <p class="mt-2 text-lg">${escaparHtml(solicitud.descripcion)}</p>
            <p class="mt-2 text-base text-slate-600">Material: ${escaparHtml(material)} · Espesor: ${escaparHtml(espesor)}</p>
            <p class="mt-2 text-lg font-bold">Estado: en revisión técnica.</p>
            <button type="button" class="btn-primary mt-3 min-h-12 text-lg" data-action="poner-precio">Revisar pieza</button>
          </article>`;
        })
        .join("")
        : `<p class="text-lg text-slate-700">Todavía no hay piezas especiales en esta demostración.</p>
           <button type="button" class="btn-primary mt-3 min-h-12 text-lg" data-action="poner-precio">Revisar pieza</button>`;

  const tarjeta = (numero, titulo, nota) => `
    <article class="rounded-xl border border-slate-300 bg-slate-50 p-4">
      <p class="measure text-4xl font-extrabold text-navy">${numero}</p>
      <h3 class="mt-1 text-lg font-bold text-navy">${titulo}</h3>
      <p class="mt-1 text-base text-slate-600">${nota}</p>
    </article>`;

  return `
    <div class="space-y-8 rounded-xl border border-slate-300 bg-white p-5 text-ink sm:p-8">
      <header>
        <p class="text-base font-bold uppercase tracking-wide text-amber-800">Demostración</p>
        <h2 class="mt-1 text-3xl font-extrabold text-navy">Bandeja</h2>
        <p class="mt-2 max-w-3xl text-lg text-slate-700">Lo que llegó y lo que espera respuesta. El aviso por correo está pendiente: todavía no se envía.</p>
      </header>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        ${tarjeta(0, "Órdenes nuevas", "Aviso por correo: pendiente")}
        ${tarjeta(enRecoleccion.length, "En recolección", "Pedidos de demostración")}
        ${tarjeta(especiales.length, "Piezas especiales", "En revisión técnica")}
        ${tarjeta(0, "Obras", "Por confirmar")}
      </div>

      <section>
        <h3 class="text-xl font-extrabold text-navy">Órdenes nuevas</h3>
        <div class="mt-3 max-h-[32rem] overflow-auto">
          <table class="tabla-taller w-full text-left text-lg sm:min-w-[44rem]">
            <thead>
              <tr class="border-b border-slate-300 text-base text-slate-600">
                <th class="py-2 pr-3 font-bold">Folio</th>
                <th class="py-2 pr-3 font-bold">Fecha</th>
                <th class="py-2 pr-3 font-bold">Cliente</th>
                <th class="py-2 pr-3 font-bold">Teléfono</th>
                <th class="num py-2 pr-3 font-bold">Piezas</th>
                <th class="num py-2 pr-3 font-bold">Metros</th>
                <th class="py-2 font-bold">Aviso por correo</th>
              </tr>
            </thead>
            <tbody>
              <tr><td class="py-3 text-lg" colspan="7">Por confirmar. Cuando el correo exista, las órdenes nuevas aparecen en esta tabla.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="taller-aprobar">
        <h3 class="text-xl font-extrabold text-navy">Pedidos en recolección</h3>
        <p class="mt-2 text-lg text-slate-700">Aprobar una orden que el cliente aceptó queda para cuando la cuenta sea real. Estos pedidos de demostración ya están en recolección.</p>
        <ul class="mt-3 space-y-3">
          ${
            enRecoleccion.length
              ? enRecoleccion
                  .map(
                    (pedido) => `<li class="rounded-lg border border-slate-300 p-4">
                      <p class="text-lg font-bold text-navy">${escaparHtml(pedido.folio)} · ${escaparHtml(pedido.cliente)}</p>
                      <p class="mt-1 text-lg">${escaparHtml(pedido.telefono)} · ${escaparHtml(pedido.fecha)}</p>
                      <p class="mt-2 text-base text-slate-600">Documento técnico y emisión: por confirmar.</p>
                      <button type="button" class="btn-primary mt-3 min-h-12 text-lg" data-action="aprobar-pedido">Aprobar y crear pedido</button>
                    </li>`
                  )
                  .join("")
              : `<li class="text-lg">Sin pedidos en recolección.</li>`
          }
        </ul>
      </section>

      <section>
        <h3 class="text-xl font-extrabold text-navy">Piezas especiales registradas</h3>
        <div class="mt-3 grid gap-3">${filasEspeciales}</div>
      </section>

      <section id="taller-obra">
        <h3 class="text-xl font-extrabold text-navy">Consultas de obra</h3>
        <p class="mt-2 text-lg text-slate-700">Las obras no entran a los lotes. El formulario de la portada solo prepara la consulta para copiarla y llamar. No queda guardado en esta bandeja.</p>
      </section>

      <section id="taller-tarifas">
        <h3 class="text-xl font-extrabold text-navy">Especificaciones de plancha</h3>
        <p class="mt-2 text-lg">Planchas disponibles en espesores de <span class="measure">0,4 mm</span> y <span class="measure">0,5 mm</span>, ancho máximo <span class="measure">122 cm</span> y largo por tira de <span class="measure">3 m</span>.</p>
      </section>
    </div>`;
}

export { empaquetarTiras, consolidarLote, renderLote, renderConsolidado, renderKanban, renderFicha, renderSolicitudesEspeciales, renderBandeja };
