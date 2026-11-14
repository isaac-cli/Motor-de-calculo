// Zona Administrativa del Cliente y Mis Boletas.
import { usuarioDemo } from "./demo/mockData.js?v=3";
import { icono } from "./iconos.js?v=3";
import { guardar, state, ui } from "./estado.js?v=3";
import { $, dom } from "./dom.js?v=3";
import { desplazarHasta, horaActual, mostrarToast, primerNombre, resaltar } from "./interfaz.js?v=3";
import { renderSubvistaCliente, renderVista } from "./vistas.js?v=3";
import { abrirAuth, iniciarSesion, renderSesion } from "./sesion.js?v=3";

export function renderBannerInvitado() {
  const esqueleto = Array.from(
    { length: 6 },
    () => `
      <div class="rounded-xl border-2 border-slate-700 bg-steel p-4">
        <div class="h-3 w-28 rounded bg-slate-600"></div>
        <div class="mt-3 h-2.5 w-40 rounded bg-slate-700"></div>
        <div class="mt-4 flex items-center justify-between">
          <div class="h-4 w-20 rounded bg-slate-600"></div>
          <div class="h-4 w-16 rounded-full bg-slate-700"></div>
        </div>
        <div class="mt-3 flex gap-1">
          <span class="h-1 flex-1 rounded-full bg-emerald-600/60"></span><span class="h-1 flex-1 rounded-full bg-blue-600/60"></span>
          <span class="h-1 flex-1 rounded-full bg-slate-700"></span><span class="h-1 flex-1 rounded-full bg-slate-700"></span>
        </div>
      </div>`
  ).join("");

  return `
    <div class="relative min-h-[420px] overflow-hidden rounded-2xl border border-slate-700/80 bg-steel/40">
      <div class="pointer-events-none grid select-none gap-4 p-6 opacity-40 blur-[3px] sm:grid-cols-3" aria-hidden="true">${esqueleto}</div>
      <div class="absolute inset-0 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-[2px]">
        <div class="card-dark relative w-full max-w-2xl overflow-hidden p-8 text-center shadow-2xl shadow-black/40">
          <div class="bg-hazard absolute inset-x-0 top-0 h-1.5"></div>
          <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40" aria-hidden="true">${icono("candado", "h-7 w-7")}</span>
          <h3 class="mt-4 text-2xl font-extrabold text-white">Zona Administrativa del Cliente</h3>
          <p class="mx-auto mt-2 max-w-lg text-slate-300">
            Inicia sesión para revisar tus boletas activas, descargar PDFs, gestionar tus direcciones de obra y enviar consultas directas al taller.
          </p>
          <ul class="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-base text-slate-400">
            <li>✓ Seguimiento de boletas en 4 etapas</li>
            <li>✓ Libreta de obras y datos de facturación</li>
            <li>✓ Tickets de soporte asociados a cada boleta</li>
          </ul>
          <button type="button" class="btn-primary mt-6 px-6 py-3 text-base" data-action="ver-demo-logueado">Iniciar Sesión / Ver Demo Logueado</button>
        </div>
      </div>
    </div>`;
}

function pintarCuenta() {
  return import("./cuenta.js?v=3").then(({ renderResumenPortalCuenta, renderVistaCuenta }) => {
    renderResumenPortalCuenta({ state, dom });
    if (ui.subvistaCliente === "cuenta") {
      renderVistaCuenta({ state, ui, contenedor: dom.vistaCuenta });
    }
  });
}

export function renderMisBoletas() {
  if (!state.sesion) {
    if (!dom.boletasSubtitulo) return;
    dom.boletasSubtitulo.textContent = "Tus boletas, direcciones de obra y consultas al taller son privadas: inicia sesión para abrir tu cuenta.";
    dom.boletasCliente.innerHTML = "";
    dom.boletasContenido.innerHTML = renderBannerInvitado();
    return;
  }
  pintarCuenta();
}

export function abrirCuenta({ seccion = "boletas", folio = null } = {}) {
  if (!state.sesion) {
    abrirAuth();
    return;
  }
  state.vista = "cliente";
  ui.subvistaCliente = "cuenta";
  ui.seccionCuenta = seccion;
  if (folio) {
    ui.boletaSeleccionada = folio;
    ui.filtroBoletasCuenta = "todas";
  }
  guardar();
  renderVista();
  window.scrollTo({ top: 0, behavior: "instant" });
}

export function volverAlPortal(selectorDestino = null) {
  state.vista = "cliente";
  ui.subvistaCliente = "portal";
  renderVista();
  if (selectorDestino) {
    $(selectorDestino)?.scrollIntoView({ behavior: "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export function seleccionarBoleta(folio) {
  ui.boletaSeleccionada = folio;
  renderMisBoletas();
}

export function verBoleta(folio) {
  abrirCuenta({ seccion: "boletas", folio });
}

export function verDemoLogueado() {
  if (!state.sesion) iniciarSesion(usuarioDemo);
  abrirCuenta({ seccion: "boletas" });
}

export async function imprimirBoleta(folio) {
  const pedido = state.pedidos.find((actual) => actual.folio === folio);
  if (!pedido) return;
  const { renderBoletaDigital } = await import("./cuenta.js?v=3");
  const direccionPrincipal = state.cuenta.direcciones.find((d) => d.principal) ?? state.cuenta.direcciones[0];
  const tituloOriginal = document.title;
  dom.zonaImpresion.innerHTML = renderBoletaDigital(pedido, {
    imprimible: true,
    perfilCuenta: state.cuenta.perfil,
    direccionPrincipal,
  });
  document.title = `Boleta ${pedido.boleta} · Colegual SpA`;
  window.addEventListener(
    "afterprint",
    () => {
      document.title = tituloOriginal;
      dom.zonaImpresion.innerHTML = "";
    },
    { once: true }
  );
  window.print();
}

export function consultarBoletaTicket(folio) {
  ui.folioTicketPreseleccionado = folio;
  ui.seccionCuenta = "tickets";
  renderSubvistaCliente();
  const bloque = $("#bloque-nuevo-ticket");
  if (bloque) {
    desplazarHasta(bloque, "center");
    resaltar(bloque);
    bloque.querySelector('input[name="asunto"]')?.focus();
  }
}

export function guardarDatosCuenta(formulario) {
  const datos = new FormData(formulario);
  const nombreAnterior = state.sesion?.nombre;
  const nuevoPerfil = {
    nombre: datos.get("nombre").trim(),
    rut: datos.get("rut").trim(),
    razonSocial: datos.get("razonSocial").trim(),
    telefono: datos.get("telefono").trim(),
    email: datos.get("email").trim().toLowerCase(),
    tipo: datos.get("tipo") || state.cuenta.perfil.tipo,
    giro: (datos.get("giro") || "").trim(),
  };
  state.cuenta.perfil = nuevoPerfil;
  if (state.sesion) {
    state.sesion = {
      ...state.sesion,
      nombre: nuevoPerfil.nombre,
      razonSocial: nuevoPerfil.razonSocial,
      rut: nuevoPerfil.rut,
      telefono: nuevoPerfil.telefono,
      email: nuevoPerfil.email,
      tipo: nuevoPerfil.tipo,
    };
    state.pedidos.forEach((pedido) => {
      if (pedido.cliente === nombreAnterior) {
        pedido.cliente = nuevoPerfil.nombre;
        pedido.telefono = nuevoPerfil.telefono;
      }
    });
  }
  guardar();
  renderSesion();
  mostrarToast("Datos de cuenta actualizados", `${nuevoPerfil.razonSocial} · RUT ${nuevoPerfil.rut}`);
}

export function agregarDireccionCuenta(formulario) {
  const datos = new FormData(formulario);
  const nueva = {
    id: `dir-${Date.now().toString(36)}`,
    alias: datos.get("alias").trim(),
    tipo: datos.get("tipo"),
    direccion: datos.get("direccion").trim(),
    referencia: datos.get("referencia").trim(),
    principal: state.cuenta.direcciones.length === 0,
  };
  state.cuenta.direcciones.push(nueva);
  guardar();
  renderMisBoletas();
  mostrarToast("Obra agregada a tu libreta", `${nueva.alias} · ${nueva.direccion}`);
}

export function marcarDireccionPrincipal(id) {
  state.cuenta.direcciones.forEach((dir) => {
    dir.principal = dir.id === id;
  });
  const principal = state.cuenta.direcciones.find((d) => d.id === id);
  guardar();
  renderMisBoletas();
  if (principal) mostrarToast("Obra principal actualizada", `${principal.alias} quedó como predeterminada.`);
}

export function eliminarDireccionCuenta(id) {
  if (state.cuenta.direcciones.length <= 1) return;
  const eliminada = state.cuenta.direcciones.find((d) => d.id === id);
  state.cuenta.direcciones = state.cuenta.direcciones.filter((d) => d.id !== id);
  if (!state.cuenta.direcciones.some((d) => d.principal) && state.cuenta.direcciones[0]) {
    state.cuenta.direcciones[0].principal = true;
  }
  guardar();
  renderMisBoletas();
  if (eliminada) mostrarToast("Dirección eliminada", `${eliminada.alias} se quitó de tu libreta.`, "info");
}

export function cambiarClaveCuenta(formulario) {
  const datos = new FormData(formulario);
  const nueva = datos.get("nueva");
  const confirmacion = datos.get("confirmacion");
  if (nueva !== confirmacion) {
    mostrarToast("Las contraseñas no coinciden", "Verifica que la nueva contraseña y su confirmación sean iguales.", "alerta");
    return;
  }
  state.cuenta.seguridad.ultimoCambioClave = `Hoy · ${horaActual()}`;
  guardar();
  renderSubvistaCliente();
  mostrarToast("Contraseña actualizada", "Tu clave de acceso quedó renovada.");
}

export function cerrarOtrasSesiones() {
  state.cuenta.seguridad.sesiones = state.cuenta.seguridad.sesiones.filter((s) => s.actual);
  guardar();
  renderSubvistaCliente();
  mostrarToast("Otras sesiones cerradas", "Solo quedó activa tu sesión en este equipo.", "info");
}

export function crearNuevoTicket(formulario) {
  const datos = new FormData(formulario);
  const folioPedido = datos.get("folioPedido");
  const pedido = state.pedidos.find((p) => p.folio === folioPedido);
  const numeros = state.cuenta.tickets.map((t) => Number(String(t.id).replace(/\D/g, "")) || 200);
  const nuevoId = `T-${Math.max(204, ...numeros) + 1}`;
  const ticket = {
    id: nuevoId,
    folioPedido,
    boleta: pedido ? pedido.boleta : "GENERAL",
    asunto: datos.get("asunto").trim(),
    categoria: datos.get("categoria"),
    estado: "abierto",
    actualizado: `Hoy · ${horaActual()}`,
    mensajes: [
      {
        autor: "cliente",
        nombre: state.sesion?.nombre || "Cliente",
        fecha: `Hoy · ${horaActual()}`,
        texto: datos.get("mensaje").trim(),
      },
    ],
  };
  state.cuenta.tickets.unshift(ticket);
  ui.ticketSeleccionado = nuevoId;
  ui.folioTicketPreseleccionado = null;
  guardar();
  renderMisBoletas();
  mostrarToast(`Ticket #${nuevoId} enviado al taller`, `Asociado a Boleta #${ticket.boleta}. El aviso de respuesta está por confirmar.`);
}

export function responderTicket(formulario) {
  const ticketId = formulario.dataset.ticket;
  const ticket = state.cuenta.tickets.find((t) => t.id === ticketId);
  if (!ticket) return;
  const texto = new FormData(formulario).get("texto").trim();
  if (!texto) return;
  ticket.mensajes.push({
    autor: "cliente",
    nombre: state.sesion?.nombre || "Cliente",
    fecha: `Hoy · ${horaActual()}`,
    texto,
  });
  ticket.actualizado = `Hoy · ${horaActual()}`;
  if (ticket.estado === "cerrado") ticket.estado = "abierto";
  guardar();
  renderSubvistaCliente();
  mostrarToast(`Mensaje enviado en Ticket #${ticket.id}`, "El taller recibió tu comentario.");
}

export function cambiarEstadoTicket(ticketId) {
  const ticket = state.cuenta.tickets.find((t) => t.id === ticketId);
  if (!ticket) return;
  ticket.estado = ticket.estado === "cerrado" ? "abierto" : "cerrado";
  ticket.actualizado = `Hoy · ${horaActual()}`;
  guardar();
  renderMisBoletas();
  mostrarToast(
    `Ticket #${ticket.id} ${ticket.estado === "cerrado" ? "marcado como resuelto" : "reabierto"}`,
    `Estado actual: ${ticket.estado.toUpperCase()}`,
    "info"
  );
}

export function simularRespuestaTaller(ticketId) {
  const ticket = state.cuenta.tickets.find((t) => t.id === ticketId);
  if (!ticket) return;
  ticket.mensajes.push({
    autor: "taller",
    nombre: "Robinson · Jefe de Plegados Colegual",
    fecha: `Hoy · ${horaActual()}`,
    texto: `Recibido don ${primerNombre(state.sesion?.nombre || "Juan")}. Revisamos la orden de la Boleta #${ticket.boleta} en el lote actual y dejamos aplicado el ajuste en su Ficha de Corte.`,
  });
  ticket.estado = "respondido";
  ticket.actualizado = `Hoy · ${horaActual()}`;
  guardar();
  renderMisBoletas();
  mostrarToast(`El Taller respondió tu Ticket #${ticket.id}`, "Estado actualizado a: Respondido por Taller.");
}
