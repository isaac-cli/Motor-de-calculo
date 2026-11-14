// Zona Administrativa del Cliente (Dashboard de Cuenta) y resumen rápido en el portal.
// Incluye: 1) Mis Boletas y Pedidos, 2) Mis Datos y Libreta de Obras,
// 3) Seguridad, Notificaciones y Sesiones, 4) Tickets de Soporte / Consultas al Taller.
import { describirTiras, formatoNumero, obtenerMaterial, nombreMaterial } from "./cotizador.js?v=3";
import { etapas, haceCuanto } from "./demo/mockData.js?v=3";
import { escaparHtml, iniciales } from "./utils.js?v=3";
import { icono } from "./iconos.js?v=3";
import { renderBannerInvitado } from "./zona-cliente.js?v=3";

const seccionesCuenta = [
  {
    id: "boletas",
    icono: "documento",
    titulo: "Pedidos y cotizaciones",
    subtitulo: "Etapas y comprobantes",
  },
  {
    id: "datos",
    icono: "usuario",
    titulo: "Mis datos",
    subtitulo: "Contacto, factura y obras",
  },
  {
    id: "seguridad",
    icono: "candado",
    titulo: "Seguridad y Contraseña",
    subtitulo: "Clave, avisos y sesiones",
  },
  {
    id: "tickets",
    icono: "herramienta",
    titulo: "Tickets de Soporte",
    subtitulo: "Consultas al taller por boleta",
  },
];

function numeroFolio(pedido) {
  return Number(pedido.folio.split("-")[1]) || 0;
}

function boletasDelCliente(state) {
  if (!state.sesion) return [];
  const nombreSesion = state.sesion.nombre;
  return state.pedidos
    .filter((pedido) => pedido.cliente === nombreSesion || pedido.clienteEmail === state.sesion.email)
    .sort((a, b) => numeroFolio(b) - numeroFolio(a));
}

function indiceEtapa(pedido) {
  return pedido.etapa === "entregado" ? etapas.length : etapas.findIndex((etapa) => etapa.id === pedido.etapa);
}

function textoEtapa(pedido) {
  const indice = indiceEtapa(pedido);
  if (indice >= etapas.length) return "Entregado";
  const etapa = etapas[indice];
  return `Etapa ${indice + 1} de 4: ${etapa.paso}`;
}

function estiloBadgeEtapa(pedido) {
  if (pedido.etapa === "entregado") return "bg-slate-700 text-slate-200";
  if (pedido.etapa === "listo") return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40";
  if (pedido.etapa === "recoleccion") return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40";
  return "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/40";
}

// Chip de etapa para las fichas claras: color y texto juntos (nunca solo color).
function chipEtapa(pedido) {
  const indice = indiceEtapa(pedido);
  const etapa = etapas[indice];
  const color =
    pedido.etapa === "listo"
      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
      : pedido.etapa === "material" || pedido.etapa === "corte"
        ? "bg-amber-50 text-accent-dark ring-1 ring-amber-300"
        : "bg-slate-100 text-slate-700 ring-1 ring-slate-300";
  return `<span class="chip-estado ${color}">${etapa ? escaparHtml(etapa.paso) : "Entregado"}</span>`;
}

function renderProgreso(pedido, alto = "h-1.5") {
  const indiceActual = indiceEtapa(pedido);
  return etapas
    .map((etapa, indice) => {
      const color =
        indice < indiceActual || (indice === indiceActual && etapa.id === "listo")
          ? "bg-emerald-500"
          : indice === indiceActual
            ? "bg-blue-500"
            : "bg-slate-700";
      return `<span class="${alto} flex-1 rounded-full ${color}"></span>`;
    })
    .join("");
}

function renderTarjetaBoleta(pedido, { seleccionada = false, redirigir = false } = {}) {
  const indice = indiceEtapa(pedido);
  const etapa = etapas[indice];
  const nombres = pedido.items.map((linea) => linea.nombre).join(", ");
  const cantidad = pedido.items.length;
  const accion = redirigir ? "abrir-boleta-cuenta" : "seleccionar-boleta";
  return `
    <li>
      <button type="button" data-action="${accion}" data-folio="${pedido.folio}" aria-pressed="${seleccionada}"
        class="group w-full rounded-xl border-2 border-slate-700 bg-steel p-4 text-left transition hover:border-amber-500/70 aria-pressed:border-accent aria-pressed:bg-amber-500/10">
        <span class="flex items-start justify-between gap-3">
          <span>
            <span class="measure block text-lg font-bold text-white group-hover:text-amber-300">Boleta #${pedido.boleta}</span>
            <span class="measure block text-base text-slate-400">Pedido ${pedido.folio}</span>
          </span>
          <span class="shrink-0 text-base text-slate-400">Emitida ${pedido.emitida ? haceCuanto(pedido.emitida) : escaparHtml(pedido.fecha)}</span>
        </span>
        <span class="mt-2 block text-lg text-slate-300">${cantidad} ${cantidad === 1 ? "perfil" : "perfiles"} · ${escaparHtml(nombres)}</span>
        <span class="mt-3 flex items-center justify-between gap-2">
          <span class="measure text-lg font-extrabold text-white">${formatoNumero(pedido.items.reduce((s, l) => s + (Number(l.metros) || 0), 0))} Mts</span>
          <span class="badge text-base ${estiloBadgeEtapa(pedido)}">${etapa ? `Etapa ${indice + 1} de 4` : "Entregado"}</span>
        </span>
        <span class="mt-2 flex items-center justify-between text-base text-slate-400">
          <span>${etapa ? etapa.paso : "Retirado por el cliente"}</span>
          ${redirigir ? `<span class="font-semibold text-amber-400 transition-transform motion-safe:group-hover:translate-x-0.5">Abrir en Mi Cuenta ${icono("flecha", "inline h-4 w-4 align-[-2px]")}</span>` : ""}
        </span>
        <span class="mt-3 flex gap-1" aria-hidden="true">${renderProgreso(pedido, "h-1")}</span>
      </button>
    </li>`;
}

function renderTracker(pedido, { mostrarAccionTicket = false } = {}) {
  const indiceActual = indiceEtapa(pedido);
  const bloques = etapas
    .map((etapa, indice) => {
      const completada = indice < indiceActual;
      const actual = indice === indiceActual;
      const listo = actual && etapa.id === "listo";
      const estilo = completada
        ? "border-emerald-500/50 bg-emerald-500/10"
        : listo
          ? "border-emerald-400 bg-emerald-500/15 ring-4 ring-emerald-500/20"
          : actual
            ? "border-blue-500 bg-blue-500/10 ring-4 ring-blue-500/20"
            : "border-slate-700 bg-slate-800/40";
      const numero = completada || listo ? "bg-emerald-500 text-navy" : actual ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-400";
      const estado = completada
        ? `<span class="text-emerald-400">Completado ✓</span>`
        : listo
          ? `<span class="text-emerald-300">¡Listo para retirar!</span>`
          : actual
            ? `<span class="inline-flex items-center gap-1.5 text-blue-300"><span class="h-2 w-2 rounded-full motion-safe:animate-pulse bg-blue-400"></span>En curso</span>`
            : `<span class="text-slate-500">Pendiente</span>`;
      const flecha =
        indice < etapas.length - 1
          ? `<li class="hidden self-center text-2xl md:block ${completada ? "text-emerald-500" : "text-slate-600"}" aria-hidden="true">${icono("flecha", "h-6 w-6")}</li>`
          : "";
      return `
        <li class="rounded-xl border-2 p-4 ${estilo} ${actual || completada ? "" : "opacity-70"}">
          <div class="flex items-center justify-between gap-2">
            <span class="measure flex h-8 w-8 items-center justify-center rounded-md text-lg font-black ${numero}">${indice + 1}</span>
            <span class="text-slate-300" aria-hidden="true">${icono(etapa.icono, "h-7 w-7")}</span>
          </div>
          <p class="mt-3 font-bold text-white">${etapa.paso}</p>
          <p class="mt-1 text-base font-semibold">${estado}</p>
          ${actual ? `<p class="mt-2 text-base leading-relaxed text-slate-300">${etapa.detalle}</p>` : ""}
        </li>
        ${flecha}`;
    })
    .join("");

  return `
    <article data-reveal class="card-dark p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="measure text-lg font-bold text-amber-400">Boleta #${pedido.boleta} · Pedido ${pedido.folio}</p>
          <h3 class="mt-1 text-lg font-bold text-white">Estado de fabricación en taller</h3>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="badge text-base ${estiloBadgeEtapa(pedido)}">${textoEtapa(pedido)}</span>
          ${
            mostrarAccionTicket
              ? `<button type="button" class="min-h-12 btn-outline-dark py-1.5 px-3 text-base" data-action="consultar-boleta-ticket" data-folio="${pedido.folio}">
                  ${icono("herramienta")} Consultar sobre esta boleta
                </button>`
              : ""
          }
        </div>
      </header>
      <div class="mt-5 flex gap-1.5" aria-hidden="true">${renderProgreso(pedido)}</div>
      <ol class="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">${bloques}</ol>
    </article>`;
}

function renderBoletaDigital(pedido, { imprimible = false, perfilCuenta = null, direccionPrincipal = null } = {}) {
  const filas = pedido.items
    .map((linea) => {
      const material = obtenerMaterial(linea.materialId);
      const pliegues = linea.lados
        .map((lado) => `<span class="whitespace-nowrap"><b class="text-accent">${lado.letra}</b> ${formatoNumero(lado.cm)}</span>`)
        .join(" · ");
      return `
        <tr class="border-b border-slate-100 align-top">
          <td class="py-3 pr-3">
            <p class="font-semibold text-navy">${escaparHtml(linea.nombre)}</p>
            <p class="mt-0.5 flex items-center gap-1.5 text-base text-slate-500">
              <span class="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-slate-300" style="background:${material.muestra}"></span>
              ${escaparHtml(nombreMaterial(linea.materialId))}
            </p>
            ${linea.molde ? `<p class="measure mt-0.5 text-base text-amber-700">+ Molde en cartón</p>` : ""}
          </td>
          <td class="measure py-3 pr-3 text-base text-slate-600">${pliegues}</td>
          <td class="measure py-3 pr-3 text-right font-bold text-navy">${formatoNumero(linea.cmD)} cm</td>
          <td class="measure py-3 pr-3 text-right">${linea.espesor} mm</td>
          <td class="measure py-3 pr-3 text-right">${formatoNumero(linea.metros)}</td>
          <td class="measure py-3 text-right font-semibold text-navy">${describirTiras(linea.metros)}</td>
        </tr>`;
    })
    .join("");
  const metrosPedido = pedido.items.reduce((s, l) => s + (Number(l.metros) || 0), 0);
  const rutCliente = perfilCuenta?.rut || "Por confirmar";
  const obraDestino = pedido.obra || direccionPrincipal?.alias || "Retiro en Taller Colegual";

  return `
    <article ${imprimible ? "" : 'id="boleta-digital"'} class="overflow-hidden rounded-xl bg-white text-slate-700 ${imprimible ? "" : "shadow-2xl shadow-black/40"}">
      <div class="bg-hazard h-1.5"></div>
      <header class="flex flex-wrap items-start justify-between gap-4 border-b-2 border-dashed border-slate-200 px-6 py-5">
        <div class="flex items-center gap-3">
          <span class="flex h-11 w-11 items-center justify-center rounded-md bg-accent">
            <svg viewBox="0 0 40 40" class="h-7 w-7" fill="none" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M6 28 L6 20 L20 10 L34 20 L34 28" /><path d="M12 32 L28 32" stroke-width="2.5" />
            </svg>
          </span>
          <div>
            <p class="text-lg font-extrabold text-navy">Colegual SpA</p>
            <p class="text-base text-slate-500">Hojalatería Industrial y Habitacional · División Plegados · Puerto Montt</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-base font-semibold uppercase tracking-wide text-slate-500">Boleta digital N°</p>
          <p class="measure text-2xl font-black text-navy">${pedido.boleta}</p>
          <p class="measure text-base text-slate-500">Pedido ${pedido.folio}</p>
        </div>
      </header>
      <dl class="grid gap-4 border-b border-slate-100 px-6 py-4 text-lg sm:grid-cols-2 xl:grid-cols-5">
        <div><dt class="field-label text-base">Fecha de emisión</dt><dd class="measure font-semibold text-navy">${escaparHtml(pedido.fecha)}</dd></div>
        <div><dt class="field-label text-base">Cliente / Razón Social</dt><dd class="font-semibold text-navy">${escaparHtml(pedido.cliente)}</dd></div>
        <div><dt class="field-label text-base">RUT</dt><dd class="measure font-semibold text-navy">${escaparHtml(rutCliente)}</dd></div>
        <div><dt class="field-label text-base">Teléfono</dt><dd class="measure text-navy">${escaparHtml(pedido.telefono)}</dd></div>
        <div><dt class="field-label text-base">Obra / Retiro</dt><dd class="font-semibold text-navy">${escaparHtml(obraDestino)}</dd></div>
      </dl>
      <div class="overflow-x-auto px-6">
        <table class="w-full min-w-[640px] text-lg">
          <caption class="sr-only">Detalle de perfiles de la boleta ${pedido.boleta}</caption>
          <thead>
            <tr class="border-b-2 border-slate-200 text-left text-base uppercase tracking-wide text-slate-500">
              <th scope="col" class="py-3 pr-3 font-semibold">Perfil</th>
              <th scope="col" class="py-3 pr-3 font-semibold">Medidas de cada pliegue (cm)</th>
              <th scope="col" class="py-3 pr-3 text-right font-semibold">CM.D</th>
              <th scope="col" class="py-3 pr-3 text-right font-semibold">Espesor</th>
              <th scope="col" class="py-3 pr-3 text-right font-semibold">Mts</th>
              <th scope="col" class="py-3 text-right font-semibold">Corte (3 m)</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-end justify-between gap-4 px-6 py-5">
        <p class="max-w-sm text-base leading-relaxed text-slate-500">
          Comprobante digital de orden de corte (medidas, ángulos y desarrollos).
        </p>
        <div class="text-right">
          <p class="text-base font-semibold uppercase tracking-wide text-slate-500">Largo total</p>
          <p class="measure text-3xl font-black text-navy">${formatoNumero(metrosPedido)} Mts</p>
        </div>
      </div>
      ${
        imprimible
          ? ""
          : `<footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <p class="text-base text-slate-500">En el diálogo de impresión elige <b>Guardar como PDF</b> para descargarla.</p>
              <button type="button" class="btn-dark text-base" data-action="imprimir-boleta" data-folio="${pedido.folio}">${icono("descargar")} Descargar / Imprimir Boleta PDF</button>
            </footer>`
      }
    </article>`;
}

// ---------------------------------------------------------------- Resumen rápido en #seguimiento (Portal principal)

function renderResumenPortalCuenta({ state, dom }) {
  const { sesion, cuenta } = state;
  if (!sesion) {
    dom.boletasSubtitulo.textContent = "Tus boletas, direcciones de obra y consultas al taller son privadas: inicia sesión para abrir tu cuenta.";
    dom.boletasCliente.innerHTML = "";
    dom.boletasContenido.innerHTML = renderBannerInvitado();
    return;
  }

  const boletas = boletasDelCliente(state);
  const ticketsAbiertos = cuenta.tickets.filter((t) => t.estado !== "cerrado").length;
  const obraPrincipal = cuenta.direcciones.find((d) => d.principal) ?? cuenta.direcciones[0];

  dom.boletasSubtitulo.textContent =
    "Presiona cualquier boleta activa o histórica, o elige un módulo de la barra lateral para abrir tu Zona Administrativa completa.";
  dom.boletasCliente.innerHTML = `
    <button type="button" data-action="abrir-cuenta" data-seccion="boletas"
      class="group flex items-center gap-3 rounded-xl bg-steel px-4 py-3 text-left ring-1 ring-slate-700 transition hover:ring-amber-400">
      <span class="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500 text-lg font-black text-navy">${escaparHtml(iniciales(sesion.nombre))}</span>
      <span class="leading-tight">
        <span class="block text-base uppercase tracking-wide text-amber-400">Ir a Zona Administrativa ${icono("flecha", "inline h-4 w-4 align-[-2px]")}</span>
        <span class="block font-bold text-white">${escaparHtml(sesion.nombre)}</span>
        <span class="block text-base text-slate-400">${escaparHtml(sesion.tipo ?? "Cliente")} · <span class="measure">${escaparHtml(cuenta.perfil.rut)}</span></span>
      </span>
    </button>`;

  const contadores = {
    boletas: `${boletas.length}`,
    datos: `${cuenta.direcciones.length} obras`,
    seguridad: "Activa",
    tickets: `${ticketsAbiertos} activos`,
  };

  dom.boletasContenido.innerHTML = `
    <div class="grid items-start gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
      <!-- Barra lateral rápida hacia la Zona Administrativa -->
      <aside class="card-dark overflow-hidden" aria-label="Accesos rápidos de Mi Cuenta">
        <div class="border-b border-slate-700/80 px-4 py-3.5">
          <p class="font-mono text-base font-semibold uppercase tracking-wider text-amber-400">Panel de Cliente</p>
          <p class="mt-0.5 text-lg font-bold text-white">Accesos rápidos de cuenta</p>
        </div>
        <nav class="divide-y divide-slate-800/80 p-2">
          ${seccionesCuenta
            .map(
              (sec) => `
                <button type="button" data-action="abrir-cuenta" data-seccion="${sec.id}"
                  class="group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-white/5">
                  <span class="flex items-center gap-3 min-w-0">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy text-base ring-1 ring-slate-700 group-hover:ring-amber-400/60" aria-hidden="true">${icono(sec.icono, "h-5 w-5 text-slate-200")}</span>
                    <span class="min-w-0">
                      <span class="block truncate text-lg font-bold text-white group-hover:text-amber-300">${sec.titulo}</span>
                      <span class="block truncate text-base text-slate-400">${sec.subtitulo}</span>
                    </span>
                  </span>
                  <span class="measure shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-base font-semibold text-slate-300 ring-1 ring-slate-700">${contadores[sec.id]}</span>
                </button>`
            )
            .join("")}
        </nav>
        ${
          obraPrincipal
            ? `<div class="border-t border-slate-700/80 bg-navy/60 px-4 py-3 text-base">
                <p class="font-semibold uppercase tracking-wide text-slate-400">Obra / Retiro principal</p>
                <p class="mt-1 font-bold text-white">${escaparHtml(obraPrincipal.alias)}</p>
                <p class="mt-0.5 text-slate-400">${escaparHtml(obraPrincipal.direccion)}</p>
              </div>`
            : ""
        }
      </aside>

      <!-- Tarjetas de boletas que redirigen a la Zona Administrativa detallada -->
      <div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-base font-semibold uppercase tracking-wide text-slate-400">
            Mis boletas activas e históricas (${boletas.length}) · <span class="text-amber-300">Toca una boleta para abrir su ficha completa</span>
          </p>
          <button type="button" class="text-base font-semibold text-amber-400 hover:underline" data-action="abrir-cuenta" data-seccion="boletas">
            Ver panel completo de cuenta ${icono("flecha", "inline h-4 w-4 align-[-2px]")}
          </button>
        </div>
        ${
          boletas.length
            ? `<ul class="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                ${boletas.map((pedido) => renderTarjetaBoleta(pedido, { seleccionada: false, redirigir: true })).join("")}
              </ul>`
            : `<div class="card-dark mt-3 p-8 text-center">
                <p class="text-base font-semibold text-white">Aún no tienes boletas emitidas</p>
                <p class="mt-1 text-base text-slate-400">Arma tu orden en el cotizador y confírmala para seguir su fabricación.</p>
              </div>`
        }
      </div>
    </div>`;
}

// ---------------------------------------------------------------- Vista dedicada: Zona Administrativa del Cliente (#vista-cuenta)

function badgeEstadoTicket(estado) {
  if (estado === "abierto") {
    return `<span class="badge text-base bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40">● Abierto</span>`;
  }
  if (estado === "respondido") {
    return `<span class="badge text-base bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40">✓ Respondido por Taller</span>`;
  }
  return `<span class="badge text-base bg-slate-700 text-slate-300">Cerrado</span>`;
}

function resumenPiezasPedido(pedido) {
  return pedido.items
    .map((linea) => `${linea.nombre} ${linea.espesor} mm · ${formatoNumero(linea.metros)} m${linea.molde ? " · con molde de cartón" : ""}`)
    .join(" · ");
}

function etapasPedido(pedido) {
  const indice = indiceEtapa(pedido);
  const nombres = ["Recolección", "Material en taller", "Corte y plegado", "Listo para retiro"];
  return etapas
    .map((etapa, posicion) => {
      const hecho = posicion < indice || (posicion === indice && etapa.id === "listo");
      const actual = posicion === indice && etapa.id !== "listo";
      const clase = hecho ? "bg-emerald-700 text-white" : actual ? "bg-amber-500 text-ink ring-2 ring-amber-600" : "bg-slate-200 text-slate-700";
      const marca = hecho ? icono("check", "h-5 w-5") : actual ? '<span class="h-2.5 w-2.5 shrink-0 rounded-full bg-ink" aria-hidden="true"></span>' : "";
      const estado = hecho ? "hecha" : actual ? "etapa actual" : "pendiente";
      return `<li class="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-center text-base font-bold ${clase}"${actual ? ' aria-current="step"' : ""}>${marca}${nombres[posicion]}<span class="sr-only"> (${estado})</span></li>`;
    })
    .join("");
}

function renderSeccionBoletasCuenta({ state }) {
  const boletas = boletasDelCliente(state);
  const enProduccion = boletas.filter((pedido) => pedido.etapa !== "listo" && pedido.etapa !== "entregado");
  const listos = boletas.filter((pedido) => pedido.etapa === "listo");
  const historial = boletas.filter((pedido) => pedido.etapa === "entregado");
  const activos = [...enProduccion, ...listos];

  if (!boletas.length) {
    return `
      <div class="rounded-xl bg-white p-10 text-center text-ink">
        <p class="text-base font-bold uppercase tracking-wide text-amber-800">Demostración</p>
        <h2 class="mt-2 text-2xl font-extrabold text-navy">Pedidos y cotizaciones</h2>
        <p class="mt-2 text-lg text-slate-700">Todavía no hay pedidos de esta cuenta en el navegador.</p>
        <button type="button" class="btn-primary mt-5 min-h-12 text-lg" data-action="volver-portal">Volver al cotizador</button>
      </div>`;
  }

  return `
    <div class="space-y-8 rounded-xl bg-white p-5 text-ink sm:p-8">
      <header>
        <p class="text-base font-bold uppercase tracking-wide text-amber-800">Demostración</p>
        <h2 class="mt-1 text-3xl font-extrabold text-navy">Pedidos y cotizaciones</h2>
        <p class="mt-2 max-w-2xl text-lg text-slate-700">Aquí ves tus cotizaciones y en qué etapa van tus pedidos. Son datos de ejemplo y se guardan solo en este navegador.</p>
      </header>

      <dl class="grid gap-3 sm:grid-cols-3">
        <div data-reveal class="rounded-lg border border-slate-300 p-4">
          <dt class="text-lg font-bold text-navy">Por aceptar</dt>
          <dd class="measure mt-1 text-4xl font-black text-navy">0</dd>
          <dd class="mt-1 text-base text-slate-600">cotizaciones</dd>
        </div>
        <div data-reveal class="rounded-lg border border-slate-300 p-4">
          <dt class="text-lg font-bold text-navy">En producción</dt>
          <dd class="measure mt-1 text-4xl font-black text-navy">${enProduccion.length}</dd>
          <dd class="mt-1 text-base text-slate-600">${enProduccion.length === 1 ? "pedido" : "pedidos"}</dd>
        </div>
        <div data-reveal class="rounded-lg border border-slate-300 p-4">
          <dt class="text-lg font-bold text-navy">Listos para retiro</dt>
          <dd class="measure mt-1 text-4xl font-black text-navy">${listos.length}</dd>
          <dd class="mt-1 text-base text-slate-600">${listos.length === 1 ? "pedido" : "pedidos"}</dd>
        </div>
      </dl>

      <section>
        <h3 class="text-xl font-extrabold text-navy">Mis cotizaciones</h3>
        <p class="mt-2 text-lg text-slate-700">Cuando la cuenta sea real, aceptas tu cotización y el taller la revisa. Ingresas con tu correo y una contraseña.</p>
      </section>

      <section class="space-y-4">
        <h3 class="text-xl font-extrabold text-navy">Mis pedidos</h3>
        ${activos
          .map(
            (pedido) => `
              <article data-reveal class="card-vida rounded-lg border border-slate-300 bg-white p-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-lg font-bold text-navy">Pedido <span class="measure">${escaparHtml(pedido.folio)}</span> · ${escaparHtml(pedido.fecha)}</p>
                  ${chipEtapa(pedido)}
                </div>
                <p class="mt-1 text-lg">${escaparHtml(resumenPiezasPedido(pedido))}</p>
                <ol class="mt-3 flex flex-col gap-2 sm:flex-row">${etapasPedido(pedido)}</ol>
                <p class="mt-3 text-lg">${pedido.etapa === "listo" ? "Puedes retirarlo en el taller. Dirección: Pje. Edmundo Lobos 5507294, 5480000 Puerto Montt, Los Lagos (plus code G2WX+9J). Horario: Por confirmar." : "Te avisamos cuando esté listo para retiro. El aviso automático está por confirmar."}</p>
                <button type="button" class="btn-outline mt-3 min-h-12 px-4 text-lg" data-action="imprimir-boleta" data-folio="${pedido.folio}">Descargar comprobante</button>
              </article>`
          )
          .join("")}
      </section>

      <section>
        <h3 class="text-xl font-extrabold text-navy">Historial</h3>
        ${
          historial.length
            ? `<div class="mt-3 overflow-x-auto"><table class="w-full min-w-[36rem] text-left text-lg">
                <thead><tr class="border-b border-slate-300 text-base text-slate-600"><th class="py-2 pr-3 font-bold">Pedido</th><th class="py-2 pr-3 font-bold">Fecha</th><th class="py-2 pr-3 font-bold">Detalle</th><th class="py-2 font-bold">Total</th></tr></thead>
                <tbody>
                  ${historial
                    .map(
                      (pedido) => `<tr class="border-b border-slate-200">
                        <td class="measure py-3 pr-3 font-bold">${escaparHtml(pedido.folio)}</td>
                        <td class="py-3 pr-3">${escaparHtml(pedido.fecha)}</td>
                        <td class="py-3 pr-3">Retirado · ${escaparHtml(resumenPiezasPedido(pedido))}</td>
                        <td class="measure py-3">${formatoNumero(pedido.items.reduce((s, l) => s + (Number(l.metros) || 0), 0))} Mts</td>
                      </tr>`
                    )
                    .join("")}
                </tbody>
              </table></div>`
            : `<p class="mt-2 text-lg text-slate-700">Todavía no hay pedidos retirados en esta demostración.</p>`
        }
      </section>

      <section class="rounded-lg border border-slate-300 p-4">
        <h3 class="text-xl font-extrabold text-navy">Soporte</h3>
        <p class="mt-2 text-lg">Para dudas sobre un pedido, llama al <a class="font-bold text-navy underline" href="tel:+56998487715">+56 9 9848 7715</a> o al <a class="font-bold text-navy underline" href="tel:+56991902967">+56 9 9190 2967</a>. Dejar un mensaje por escrito aquí está en revisión.</p>
      </section>
    </div>`;
}

function renderSeccionDatosCuenta({ state }) {
  const { perfil, direcciones, seguridad } = state.cuenta;
  const avisos = seguridad?.notificaciones || {};
  return `
    <div class="space-y-6 rounded-xl bg-white p-5 text-ink sm:p-8">
      <header>
        <p class="text-base font-bold uppercase tracking-wide text-amber-800">Demostración</p>
        <h2 class="mt-1 text-3xl font-extrabold text-navy">Mis datos</h2>
        <p class="mt-2 max-w-2xl text-lg text-slate-700">Con estos datos se completa solo el paso «Mis datos» cuando cotizas. Son datos de ejemplo y se guardan solo en este navegador.</p>
      </header>

      <form id="form-datos-cuenta" class="space-y-6">
        <input type="hidden" name="tipo" value="${escaparHtml(perfil.tipo || "")}">
        <section>
          <h3 class="text-xl font-extrabold text-navy">Datos personales</h3>
          <div class="mt-3 grid gap-4 sm:grid-cols-3">
            <label class="block text-lg font-semibold">Nombre<input name="nombre" type="text" required class="input mt-1 text-lg" value="${escaparHtml(perfil.nombre)}"></label>
            <label class="block text-lg font-semibold">Teléfono<input name="telefono" type="tel" required class="input mt-1 text-lg" value="${escaparHtml(perfil.telefono)}"></label>
            <label class="block text-lg font-semibold">Correo<input name="email" type="email" required class="input mt-1 text-lg" value="${escaparHtml(perfil.email)}"></label>
          </div>
          <p class="mt-2 text-base text-slate-600">Aquí te llega la copia de tus cotizaciones, cuando el aviso por correo exista.</p>
        </section>
        <section>
          <h3 class="text-xl font-extrabold text-navy">Para factura (opcional)</h3>
          <div class="mt-3 grid gap-4 sm:grid-cols-3">
            <label class="block text-lg font-semibold">RUT<input name="rut" type="text" class="input mt-1 text-lg" value="${escaparHtml(perfil.rut || "")}" placeholder="Ejemplo: 12.345.678-5"></label>
            <label class="block text-lg font-semibold">Razón social<input name="razonSocial" type="text" class="input mt-1 text-lg" value="${escaparHtml(perfil.razonSocial || "")}"></label>
            <label class="block text-lg font-semibold">Giro<input name="giro" type="text" class="input mt-1 text-lg" value="${escaparHtml(perfil.giro || "")}" placeholder="Por confirmar"></label>
          </div>
        </section>
        <button type="submit" class="btn-primary min-h-12 px-5 text-lg">Guardar mis datos</button>
      </form>

      <section>
        <h3 class="text-xl font-extrabold text-navy">Direcciones de obra</h3>
        <ul class="mt-3 grid gap-3 sm:grid-cols-2">
          ${direcciones
            .map(
              (dir) => `
                <li class="rounded-lg border border-slate-300 bg-slate-50 p-4">
                  <p class="text-lg font-bold text-navy">${escaparHtml(dir.alias)}</p>
                  <p class="mt-1 text-lg">${escaparHtml(dir.direccion)}</p>
                  <p class="mt-1 text-base text-slate-600">${escaparHtml(dir.referencia)}</p>
                  <div class="mt-3 flex flex-wrap gap-2">
                    ${
                      dir.principal
                        ? `<span class="inline-flex min-h-12 items-center rounded-md bg-amber-100 px-3 text-base font-bold text-ink">Principal</span>`
                        : `<button type="button" class="min-h-12 rounded-md border border-slate-400 px-3 text-base font-semibold" data-action="marcar-direccion-principal" data-id="${dir.id}">Usar como principal</button>`
                    }
                    ${
                      direcciones.length > 1
                        ? `<button type="button" class="min-h-12 rounded-md border border-slate-400 px-3 text-base font-semibold" data-action="eliminar-direccion" data-id="${dir.id}">Eliminar</button>`
                        : ""
                    }
                  </div>
                </li>`
            )
            .join("")}
        </ul>
        <form id="form-nueva-direccion" class="mt-4 grid gap-3 rounded-lg border border-dashed border-slate-400 p-4">
          <p class="text-lg font-bold text-navy">Agregar dirección</p>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="text-lg font-semibold">Nombre<input name="alias" required class="input mt-1 text-lg" placeholder="Ejemplo: Casa"></label>
            <label class="text-lg font-semibold">Tipo
              <select name="tipo" class="input mt-1 text-lg">
                <option value="Obra en terreno">Obra</option>
                <option value="Bodega">Bodega</option>
                <option value="Retiro en taller">Retiro en taller</option>
              </select>
            </label>
          </div>
          <label class="text-lg font-semibold">Dirección<input name="direccion" required class="input mt-1 text-lg" placeholder="Calle y comuna"></label>
          <label class="text-lg font-semibold">Referencia<input name="referencia" required class="input mt-1 text-lg" placeholder="Opcional, un dato para llegar"></label>
          <button type="submit" class="btn-outline min-h-12 w-fit px-4 text-lg">Guardar dirección</button>
        </form>
      </section>

      <section class="grid gap-4 lg:grid-cols-2">
        <form id="form-clave-cuenta" class="rounded-lg border border-slate-300 p-4">
          <h3 class="text-xl font-extrabold text-navy">Seguridad</h3>
          <p class="mt-1 text-base text-slate-600">Cambiada por última vez: ${escaparHtml(seguridad?.ultimoCambioClave || "Por confirmar")}. En la demostración la clave no se guarda de verdad.</p>
          <label class="mt-3 block text-lg font-semibold">Contraseña actual<input name="actual" type="password" required class="input mt-1 text-lg" autocomplete="current-password"></label>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <label class="text-lg font-semibold">Nueva<input name="nueva" type="password" required minlength="6" class="input mt-1 text-lg" autocomplete="new-password"></label>
            <label class="text-lg font-semibold">Repetir<input name="confirmacion" type="password" required minlength="6" class="input mt-1 text-lg" autocomplete="new-password"></label>
          </div>
          <button type="submit" class="btn-primary mt-4 min-h-12 px-4 text-lg">Cambiar contraseña</button>
        </form>
        <div class="rounded-lg border border-slate-300 p-4">
          <h3 class="text-xl font-extrabold text-navy">Avisos</h3>
          <label class="mt-3 flex min-h-12 items-center gap-3 text-lg"><input class="h-6 w-6" type="checkbox" data-notificacion-cuenta="correoBoleta" ${avisos.correoBoleta ? "checked" : ""}> Recibir por correo la copia de mis cotizaciones</label>
          <label class="mt-2 flex min-h-12 items-center gap-3 text-lg"><input class="h-6 w-6" type="checkbox" data-notificacion-cuenta="avisoListo" ${avisos.avisoListo ? "checked" : ""}> Avisarme cuando mi pedido esté listo para retiro</label>
          <p class="mt-3 text-base text-slate-600">Este dispositivo está activo ahora.</p>
          <button type="button" class="btn-outline mt-3 min-h-12 px-4 text-lg" data-action="cerrar-otras-sesiones">Cerrar las demás sesiones</button>
        </div>
      </section>
    </div>`;
}

function renderSeccionSeguridadCuenta({ state }) {
  const { seguridad } = state.cuenta;
  const { notificaciones, sesiones } = seguridad;

  const itemsNotificacion = [
    {
      clave: "avisoListo",
      titulo: "Avisarme cuando mi pedido esté listo para retiro",
      detalle: "El aviso queda anotado en esta demostración. Todavía no se envía solo.",
    },
    {
      clave: "avisoLote",
      titulo: "Avisarme cuando el pedido entre a corte",
      detalle: "El aviso queda anotado en esta demostración. Todavía no se envía solo.",
    },
    {
      clave: "avisoTickets",
      titulo: "Avisarme cuando el taller responda una consulta",
      detalle: "El aviso queda anotado en esta demostración. Todavía no se envía solo.",
    },
    {
      clave: "correoBoleta",
      titulo: "Recibir por correo la copia de mis cotizaciones",
      detalle: "El aviso por correo todavía no existe. La preferencia se guarda solo en este navegador.",
    },
  ];

  return `
    <div class="space-y-8">
      <header class="border-b border-slate-300 pb-4">
        <p class="text-base font-bold uppercase tracking-wide text-amber-800">Demostración</p>
        <h2 class="mt-1 text-2xl font-extrabold text-navy">Seguridad, contraseña y avisos</h2>
        <p class="mt-1 text-lg text-slate-700">Actualiza tu contraseña, elige qué avisos recibir y revisa tus sesiones abiertas. El aviso todavía no se envía solo.</p>
      </header>

      <div class="grid items-start gap-6 xl:grid-cols-2">
        <!-- Cambio de contraseña -->
        <article data-reveal class="card-dark p-6">
          <div class="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-4">
            <div>
              <h3 class="text-lg font-extrabold text-white">Cambiar contraseña</h3>
              <p class="text-base text-slate-400">Última actualización: <span class="measure text-slate-200">${escaparHtml(seguridad.ultimoCambioClave)}</span></p>
            </div>
            <span class="badge text-base bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40">Cuenta protegida</span>
          </div>

          <form id="form-clave-cuenta" class="mt-5 space-y-4">
            <label class="block">
              <span class="field-label text-base text-slate-300">Contraseña actual</span>
              <input name="actual" type="password" required class="input text-lg" placeholder="••••••••" autocomplete="current-password">
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="field-label text-base text-slate-300">Nueva contraseña</span>
                <input name="nueva" type="password" required minlength="6" class="input text-lg" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
              </label>
              <label class="block">
                <span class="field-label text-base text-slate-300">Confirmar nueva contraseña</span>
                <input name="confirmacion" type="password" required minlength="6" class="input text-lg" placeholder="Repite la contraseña" autocomplete="new-password">
              </label>
            </div>
            <button type="submit" class="min-h-12 btn-primary py-2.5 px-5 text-lg">Actualizar contraseña</button>
          </form>

          <!-- Sesiones activas -->
          <div class="mt-8 border-t border-slate-700/80 pt-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 class="text-lg font-extrabold text-white">Sesiones y dispositivos activos (${sesiones.length})</h4>
                <p class="text-base text-slate-400">Equipos donde tu cuenta Colegual está iniciada.</p>
              </div>
              ${
                sesiones.length > 1
                  ? `<button type="button" class="min-h-12 btn-outline-dark py-1.5 px-3 text-base" data-action="cerrar-otras-sesiones">
                      Cerrar otras sesiones
                    </button>`
                  : ""
              }
            </div>
            <ul class="mt-3 space-y-2.5">
              ${sesiones
                .map(
                  (ses) => `
                    <li class="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-navy/60 px-3.5 py-2.5 text-base">
                      <div>
                        <p class="font-bold text-white">${escaparHtml(ses.dispositivo)}</p>
                        <p class="text-slate-400">${escaparHtml(ses.ubicacion)} · ${escaparHtml(ses.actividad)}</p>
                      </div>
                      ${
                        ses.actual
                          ? `<span class="badge text-base bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40">Sesión actual</span>`
                          : `<span class="badge text-base bg-slate-800 text-slate-400">Remota</span>`
                      }
                    </li>`
                )
                .join("")}
            </ul>
          </div>
        </article>

        <!-- Preferencias de notificaciones -->
        <article data-reveal class="card-dark p-6">
          <div class="border-b border-slate-700/80 pb-4">
            <h3 class="text-lg font-extrabold text-white">Avisos del taller</h3>
            <p class="mt-0.5 text-base text-slate-400">
              El canal de los avisos está por confirmar. Teléfono <span class="measure font-semibold text-amber-300">${escaparHtml(state.cuenta.perfil.telefono)}</span> y correo <span class="measure text-slate-200">${escaparHtml(state.cuenta.perfil.email)}</span>.
            </p>
          </div>

          <div class="mt-5 space-y-3">
            ${itemsNotificacion
              .map(
                (item) => `
                  <label class="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-700 bg-navy/60 p-4 transition hover:border-slate-500 has-[:checked]:border-amber-500/50">
                    <div>
                      <p class="text-lg font-bold text-white">${item.titulo}</p>
                      <p class="mt-1 text-base leading-relaxed text-slate-400">${item.detalle}</p>
                    </div>
                    <input type="checkbox" data-notificacion-cuenta="${item.clave}" class="mt-1 h-5 w-5 shrink-0 accent-amber-500"
                      ${notificaciones[item.clave] ? "checked" : ""}>
                  </label>`
              )
              .join("")}
          </div>
        </article>
      </div>
    </div>`;
}

function renderSeccionTicketsCuenta({ state, ui }) {
  const { tickets } = state.cuenta;
  const boletas = boletasDelCliente(state);

  if (!tickets.some((t) => t.id === ui.ticketSeleccionado)) {
    ui.ticketSeleccionado = tickets[0]?.id ?? null;
  }
  const activo = tickets.find((t) => t.id === ui.ticketSeleccionado) ?? tickets[0];
  const folioPreseleccionado = ui.folioTicketPreseleccionado || boletas[0]?.folio || "CG-1042";

  return `
    <div class="space-y-8">
      <header class="border-b border-slate-300 pb-4">
        <p class="text-base font-bold uppercase tracking-wide text-amber-800">Demostración · en revisión</p>
        <h2 class="mt-1 text-2xl font-extrabold text-navy">Consultas al taller</h2>
        <p class="mt-1 text-lg text-slate-700">
          Dejar un mensaje por escrito sigue en revisión. Para una duda de un pedido, llama al <a class="font-bold text-navy underline" href="tel:+56998487715">+56 9 9848 7715</a> o al <a class="font-bold text-navy underline" href="tel:+56991902967">+56 9 9190 2967</a>.
        </p>
      </header>

      <div class="grid items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <!-- Columna izquierda: historial de tickets + formulario nuevo ticket -->
        <div class="space-y-6">
          <div class="card-dark p-4">
            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold uppercase tracking-wide text-slate-400">Mis consultas (${tickets.length})</h3>
              <span class="measure text-base text-amber-400">${tickets.filter((t) => t.estado !== "cerrado").length} activos</span>
            </div>
            <ul class="mt-3 space-y-2.5">
              ${tickets
                .map(
                  (ticket) => `
                    <li>
                      <button type="button" data-action="seleccionar-ticket" data-ticket="${ticket.id}" aria-pressed="${ticket.id === activo?.id}"
                        class="w-full rounded-xl border-2 border-slate-700 bg-navy/70 p-3.5 text-left transition hover:border-slate-500 aria-pressed:border-accent aria-pressed:bg-amber-500/10">
                        <div class="flex items-center justify-between gap-2">
                          <span class="measure text-base font-extrabold text-amber-400">Ticket #${escaparHtml(ticket.id)} · Boleta #${escaparHtml(ticket.boleta)}</span>
                          ${badgeEstadoTicket(ticket.estado)}
                        </div>
                        <p class="mt-2 text-lg font-bold leading-snug text-white">${escaparHtml(ticket.asunto)}</p>
                        <p class="mt-1.5 flex items-center justify-between text-base text-slate-400">
                          <span>${escaparHtml(ticket.categoria)}</span>
                          <span class="measure">${escaparHtml(ticket.actualizado)}</span>
                        </p>
                      </button>
                    </li>`
                )
                .join("")}
            </ul>
          </div>

          <!-- Formulario rápido para abrir nuevo ticket -->
          <article data-reveal class="card-dark p-5" id="bloque-nuevo-ticket">
            <h3 class="text-base font-extrabold text-white">+ Abrir nueva consulta al taller</h3>
            <p class="mt-0.5 text-base text-slate-400">El Jefe de Taller recibe el detalle técnico de la boleta que elijas.</p>

            <form id="form-nuevo-ticket" class="mt-4 space-y-3.5">
              <label class="block">
                <span class="field-label text-base text-slate-300">Boleta relacionada</span>
                <select name="folioPedido" class="input measure bg-navy text-white border-slate-600 text-base">
                  ${boletas
                    .map(
                      (p) =>
                        `<option value="${p.folio}" ${p.folio === folioPreseleccionado ? "selected" : ""}>
                          Boleta #${p.boleta} (${p.folio}) · ${p.items.map((i) => i.nombre).join(", ")}
                        </option>`
                    )
                    .join("")}
                  <option value="GENERAL">Consulta general de obra (sin boleta)</option>
                </select>
              </label>

              <label class="block">
                <span class="field-label text-base text-slate-300">Motivo de la consulta</span>
                <select name="categoria" class="input bg-navy text-white border-slate-600 text-base">
                  <option value="Cambio antes de compra de lote">Cambio de color / espesor antes del cierre de lote</option>
                  <option value="Duda con medida de corte en terreno">Duda con medida de corte o pliegue en terreno</option>
                  <option value="Coordinación de retiro en taller">Coordinación de retiro en taller</option>
                  <option value="Facturación / RUT">Facturación o datos de boleta</option>
                </select>
              </label>

              <label class="block">
                <span class="field-label text-base text-slate-300">Asunto corto</span>
                <input name="asunto" type="text" required class="input text-lg bg-navy text-white border-slate-600" placeholder="Ej: ¿Puedo agregar 2 tiras más de Cumbrera al pedido?">
              </label>

              <label class="block">
                <span class="field-label text-base text-slate-300">Mensaje para el taller</span>
                <textarea name="mensaje" rows="3" required class="input text-lg bg-navy text-white border-slate-600" placeholder="Indica las medidas en cm, color o duda técnica…"></textarea>
              </label>

              <button type="submit" class="min-h-12 btn-primary w-full py-2.5 text-lg">Enviar Ticket al Taller ${icono("flecha")}</button>
            </form>
          </article>
        </div>

        <!-- Columna derecha: hilo de conversación del ticket seleccionado -->
        ${
          activo
            ? `<article class="card-dark flex flex-col justify-between p-6">
                <div>
                  <header class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700/80 pb-4">
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="measure text-lg font-extrabold text-amber-400">Ticket #${escaparHtml(activo.id)}</span>
                        <span class="text-slate-600">·</span>
                        <span class="measure text-lg font-semibold text-slate-300">Boleta #${escaparHtml(activo.boleta)} (${escaparHtml(activo.folioPedido)})</span>
                        ${badgeEstadoTicket(activo.estado)}
                      </div>
                      <h3 class="mt-2 text-xl font-extrabold text-white">${escaparHtml(activo.asunto)}</h3>
                      <p class="mt-1 text-base text-slate-400">Categoría: <span class="text-slate-300">${escaparHtml(activo.categoria)}</span> · Última actividad: <span class="measure">${escaparHtml(activo.actualizado)}</span></p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      ${
                        activo.folioPedido && activo.folioPedido !== "GENERAL"
                          ? `<button type="button" class="min-h-12 btn-outline-dark py-1.5 px-3 text-base" data-action="abrir-boleta-cuenta" data-folio="${activo.folioPedido}">
                              ${icono("documento")} Ver Boleta #${escaparHtml(activo.boleta)}
                            </button>`
                          : ""
                      }
                      <button type="button" class="min-h-12 btn-outline-dark py-1.5 px-3 text-base" data-action="cambiar-estado-ticket" data-ticket="${activo.id}">
                        ${activo.estado === "cerrado" ? `${icono("reabrir")} Reabrir ticket` : `${icono("check")} Marcar como resuelto`}
                      </button>
                    </div>
                  </header>

                  <!-- Mensajes del hilo -->
                  <div class="mt-5 space-y-4">
                    ${activo.mensajes
                      .map((msg) => {
                        const esTaller = msg.autor === "taller";
                        return `
                          <div class="rounded-xl border ${
                            esTaller ? "border-amber-500/40 bg-amber-500/10 ml-0 sm:mr-8" : "border-slate-700 bg-navy/80 sm:ml-8"
                          } p-4">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                              <span class="text-base font-extrabold ${esTaller ? "text-amber-300" : "text-white"}">
                                ${icono(esTaller ? "herramienta" : "usuario", "mr-1 inline h-4 w-4 align-[-2px]")}${escaparHtml(msg.nombre)}
                              </span>
                              <span class="measure text-base text-slate-400">${escaparHtml(msg.fecha)}</span>
                            </div>
                            <p class="mt-2 text-lg leading-relaxed text-slate-200">${escaparHtml(msg.texto)}</p>
                          </div>`;
                      })
                      .join("")}
                  </div>
                </div>

                <!-- Responder en el ticket -->
                <div class="mt-6 border-t border-slate-700/80 pt-5">
                  <form id="form-respuesta-ticket" data-ticket="${activo.id}" class="space-y-3">
                    <label class="block">
                      <span class="field-label text-base text-slate-300">Agregar respuesta o comentario al Ticket #${escaparHtml(activo.id)}</span>
                      <textarea name="texto" rows="2" required class="input text-lg bg-navy text-white border-slate-600" placeholder="Escribe un mensaje adicional para el taller…"></textarea>
                    </label>
                    <div class="flex flex-wrap items-center justify-between gap-3">
                      <button type="submit" class="min-h-12 btn-primary py-2 px-4 text-base">Responder en el ticket</button>
                      ${
                        activo.estado === "abierto"
                          ? `<button type="button" class="min-h-12 btn-outline-dark py-2 px-3 text-base text-amber-300 border-amber-500/40"
                              data-action="simular-respuesta-taller" data-ticket="${activo.id}">
                              ${icono("rayo")} Simular respuesta del Taller
                            </button>`
                          : ""
                      }
                    </div>
                  </form>
                </div>
              </article>`
            : ""
        }
      </div>
    </div>`;
}

function renderVistaCuenta({ state, ui, contenedor }) {
  if (!contenedor) return;
  if (!state.sesion) {
    contenedor.innerHTML = `
      <div class="mx-auto max-w-4xl px-4 py-12">
        ${renderBannerInvitado()}
      </div>`;
    return;
  }

  const seccionActiva = ui.seccionCuenta || "boletas";
  const boletas = boletasDelCliente(state);
  const { perfil, direcciones, tickets } = state.cuenta;
  const ticketsAbiertos = tickets.filter((t) => t.estado !== "cerrado").length;
  const obraPrincipal = direcciones.find((d) => d.principal) ?? direcciones[0];

  const insignias = {
    boletas: boletas.length,
    datos: direcciones.length,
    seguridad: "OK",
    tickets: ticketsAbiertos,
  };

  let contenidoPrincipal = "";
  if (seccionActiva === "boletas") {
    contenidoPrincipal = renderSeccionBoletasCuenta({ state, ui });
  } else if (seccionActiva === "datos") {
    contenidoPrincipal = renderSeccionDatosCuenta({ state });
  } else if (seccionActiva === "seguridad") {
    contenidoPrincipal = renderSeccionSeguridadCuenta({ state });
  } else if (seccionActiva === "tickets") {
    contenidoPrincipal = renderSeccionTicketsCuenta({ state, ui });
  }

  contenedor.innerHTML = `
    <div class="border-b border-slate-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 py-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-xl font-black text-ink">
              ${escaparHtml(iniciales(perfil.nombre))}
            </span>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="badge bg-amber-100 font-mono text-base uppercase tracking-widest text-ink ring-1 ring-amber-600/30">
                  Demostración · Mi cuenta
                </span>
                <span class="measure text-base font-semibold text-slate-700">RUT ${escaparHtml(perfil.rut)}</span>
              </div>
              <h1 class="mt-1 text-2xl font-black tracking-tight text-navy sm:text-3xl">${escaparHtml(perfil.razonSocial || perfil.nombre)}</h1>
              <p class="text-base text-slate-700">
                ${escaparHtml(perfil.tipo)} · Teléfono <span class="measure font-semibold text-amber-800">${escaparHtml(perfil.telefono)}</span>
                ${obraPrincipal ? ` · Obra activa: <b class="text-navy">${escaparHtml(obraPrincipal.alias)}</b>` : ""}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <button type="button" class="btn-outline min-h-12 px-4 py-2.5 text-base font-bold" data-action="volver-portal">
              ${icono("volver")} Volver al cotizador
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-4 py-8">
      <div class="grid items-start gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside class="overflow-hidden rounded-xl border border-slate-300 bg-white lg:sticky lg:top-24" aria-label="Menú de Mi cuenta">
          <div class="border-b border-slate-200 px-4 py-3">
            <p class="font-mono text-base font-bold uppercase tracking-wider text-slate-600">Mi cuenta</p>
          </div>
          <nav class="flex gap-1 overflow-x-auto p-2 lg:flex-col">
            ${seccionesCuenta
              .map((sec) => {
                const activa = sec.id === seccionActiva;
                return `
                  <button type="button" data-action="cambiar-seccion-cuenta" data-seccion="${sec.id}" aria-current="${activa ? "page" : "false"}"
                    class="flex min-h-12 shrink-0 items-center justify-between gap-3 rounded-lg px-3.5 py-3 text-left transition ${
                      activa
                        ? "bg-amber-500 font-extrabold text-ink shadow-md"
                        : "text-navy hover:bg-slate-100"
                    }">
                    <span class="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true">${icono(sec.icono)}</span>
                      <span class="min-w-0">
                        <span class="block text-base font-bold leading-tight sm:text-lg">${sec.titulo}</span>
                        <span class="hidden text-base lg:block ${activa ? "font-medium text-ink/80" : "text-slate-600"}">${sec.subtitulo}</span>
                      </span>
                    </span>
                    <span class="measure rounded-full px-2 py-0.5 text-base font-bold ${
                      activa ? "bg-navy text-amber-300" : "bg-slate-100 text-navy"
                    }">${insignias[sec.id]}</span>
                  </button>`;
              })
              .join("")}
          </nav>
          <div class="border-t border-slate-200 p-3">
            <button type="button" class="min-h-12 w-full rounded-lg px-3 text-left text-lg font-bold text-navy hover:bg-slate-100" data-action="cerrar-sesion">Cerrar sesión</button>
          </div>
          <div class="hidden border-t border-slate-200 bg-slate-50 p-4 text-base text-slate-700 lg:block">
            <p class="font-semibold text-navy">¿Necesitas cotizar otra pieza?</p>
            <p class="mt-1 leading-relaxed">Tu carrito conserva los perfiles que estabas armando.</p>
            <button type="button" class="btn-primary mt-3 min-h-12 w-full py-2 text-base" data-action="volver-cotizador">
              Ir a la mesa de cotización
            </button>
          </div>
        </aside>

        <!-- Contenido de la pestaña activa -->
        <section class="min-w-0 motion-safe:animate-fade-in" aria-live="polite">
          ${contenidoPrincipal}
        </section>
      </div>
    </div>`;
}

export {
  renderBoletaDigital,
  renderResumenPortalCuenta,
  renderVistaCuenta,
};
