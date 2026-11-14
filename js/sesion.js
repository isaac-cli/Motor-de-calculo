// Sesión simulada: login, registro, cierre de sesión y diálogo de autenticación.
import { formatoNumero } from "./cotizador.js?v=3";
import { escaparHtml, iniciales } from "./utils.js?v=3";
import { guardar, state, ui } from "./estado.js?v=3";
import { dom } from "./dom.js?v=3";
import { mostrarToast, primerNombre } from "./interfaz.js?v=3";
import { renderSubvistaCliente } from "./vistas.js?v=3";
import { crearPedido, renderCarrito } from "./carrito.js?v=3";
import { abrirCuenta, renderMisBoletas } from "./zona-cliente.js?v=3";

const htmlInvitado = '<a class="account-link" href="cotizador.html#ingresar" data-action="abrir-auth">Ingresar</a>';

export function renderSesion() {
  const { sesion } = state;

  if (dom.navAuth && sesion) {
    dom.navAuth.innerHTML = `
      <button type="button" data-action="abrir-cuenta" data-seccion="boletas"
        class="flex min-h-12 items-center gap-2 rounded-md bg-white/5 py-1 pl-1 pr-3 text-left text-base ring-1 ring-slate-700 transition hover:bg-white/10 hover:ring-amber-400">
        <span class="flex h-10 w-10 items-center justify-center rounded bg-amber-500 text-base font-black text-navy">${escaparHtml(iniciales(sesion.nombre))}</span>
        <span class="hidden leading-tight sm:block">
          <span class="block font-semibold text-white">${escaparHtml(primerNombre(sesion.nombre))}</span>
          <span class="block text-base text-amber-300">${escaparHtml(sesion.tipo ?? "Mi Cuenta")} · Panel ▾</span>
        </span>
      </button>
      <button type="button" class="btn-outline-dark" data-action="cerrar-sesion">Salir</button>`;
  } else if (dom.navAuth && !dom.navAuth.querySelector("a.account-link")) {
    dom.navAuth.innerHTML = htmlInvitado;
  }

  renderCarrito();
  renderMisBoletas();
  renderSubvistaCliente();
}

function sincronizarPerfilConSesion(sesion) {
  if (!sesion) return;
  state.cuenta.perfil = {
    ...state.cuenta.perfil,
    nombre: sesion.nombre || state.cuenta.perfil.nombre,
    razonSocial: sesion.razonSocial || state.cuenta.perfil.razonSocial || sesion.nombre,
    rut: sesion.rut || state.cuenta.perfil.rut || "Por confirmar",
    tipo: sesion.tipo || state.cuenta.perfil.tipo || "Constructora / Maestro",
    email: sesion.email || state.cuenta.perfil.email,
    telefono: sesion.telefono || state.cuenta.perfil.telefono,
  };
}

export function iniciarSesion(sesion) {
  const confirmarAlEntrar = ui.authPendiente;
  ui.authPendiente = false;
  state.sesion = sesion;
  sincronizarPerfilConSesion(sesion);
  guardar();
  if (dom.modalAuth.open) dom.modalAuth.close();
  renderSesion();
  if (confirmarAlEntrar && state.carrito.length) {
    crearPedido();
  } else if (window.location.hash === "#cuenta") {
    abrirCuenta({});
  } else {
    mostrarToast(`Hola, ${primerNombre(sesion.nombre)}`, "Sesión iniciada. Haz clic en tu perfil arriba para abrir tu Zona Administrativa.", "info");
  }
}

export function cerrarSesion() {
  if (!state.sesion) return;
  state.sesion = null;
  state.ultimoFolio = null;
  ui.boletaSeleccionada = null;
  ui.subvistaCliente = "portal";
  guardar();
  renderSesion();
  mostrarToast("Sesión cerrada", "Puedes seguir cotizando como invitado.", "info");
}

export function abrirAuth({ gate = false } = {}) {
  ui.authPendiente = gate;
  dom.authGate.classList.toggle("hidden", !gate);
  if (gate) {
    const metros = state.carrito.reduce((suma, linea) => suma + (Number(linea.metros) || 0), 0);
    const cantidad = state.carrito.length;
    dom.authGateDetalle.textContent = cantidad === 1
      ? `Tu pieza queda guardada (${formatoNumero(metros)} Mts). En esta demostración, al entrar se arma el pedido con la lista.`
      : `Tus ${cantidad} piezas quedan guardadas (${formatoNumero(metros)} Mts). En esta demostración, al entrar se arma el pedido con la lista.`;
  }
  cambiarTabAuth("login");
  dom.modalAuth.showModal();
}

export function cambiarTabAuth(tab) {
  const esLogin = tab === "login";
  dom.formLogin.classList.toggle("hidden", !esLogin);
  dom.formRegistro.classList.toggle("hidden", esLogin);
  dom.authTitulo.textContent = esLogin ? "Ingresar" : "Crear cuenta";
  document.querySelectorAll('[data-action="auth-tab"]').forEach((boton) => {
    boton.setAttribute("aria-selected", String(boton.dataset.tab === tab));
  });
}
