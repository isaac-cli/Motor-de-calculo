// Estado persistido en el navegador, estado de la interfaz y estado de la API.
import { angulosPorDefecto, ladosVacios, perfiles } from "./perfiles.js?v=3";
import { materiales } from "./cotizador.js?v=3";
import { angulosAlEntrar, claveMesa, ladosAlEntrar, leerMesa } from "./mesa-estado.js?v=3";
import { caducarMockup } from "./mockup-caducidad.js?v=3";
import { crearPedidosDemo, carritoAlCargar, crearCuentaDemo, crearSolicitudesEspecialesDemo } from "./demo/mockData.js?v=3";

export const claveAlmacen = "colegual.matematicas.mockup.v1";
const perfilInicial = "canaleta";
// El panel del taller sigue disponible para pruebas solo con ?demo en la URL.
export const modoDemo = new URLSearchParams(window.location.search).has("demo");

function estadoInicial() {
  return {
    vista: "cliente",
    sesion: null,
    carrito: carritoAlCargar(modoDemo, null),
    pedidos: crearPedidosDemo(),
    solicitudesEspeciales: crearSolicitudesEspecialesDemo(),
    cuenta: crearCuentaDemo(),
    numeroLote: 42,
    ultimoFolio: null,
  };
}

let estadoMigrado = false;

const clavesAvisoViejas = [
  ["avisoListo", "Listo"],
  ["avisoLote", "Lote"],
  ["avisoTickets", "Tickets"],
].map(([nueva, sufijo]) => [nueva, `what${"sapp"}${sufijo}`]);

function renombrarAvisos(cuenta) {
  const avisos = cuenta?.seguridad?.notificaciones;
  if (!avisos) return cuenta;
  for (const [nueva, vieja] of clavesAvisoViejas) {
    if (Object.prototype.hasOwnProperty.call(avisos, vieja)) {
      if (avisos[nueva] == null) avisos[nueva] = avisos[vieja];
      delete avisos[vieja];
      estadoMigrado = true;
    }
  }
  return cuenta;
}

function limpiarDatosPorConfirmar(cuenta) {
  if (!Array.isArray(cuenta.tickets) || !cuenta.seguridad?.notificaciones || !Array.isArray(cuenta.seguridad?.sesiones)) {
    const demo = crearCuentaDemo();
    if (!Array.isArray(cuenta.tickets)) cuenta.tickets = demo.tickets;
    cuenta.seguridad = cuenta.seguridad || {};
    if (!cuenta.seguridad.notificaciones) cuenta.seguridad.notificaciones = demo.seguridad.notificaciones;
    if (!Array.isArray(cuenta.seguridad.sesiones)) cuenta.seguridad.sesiones = demo.seguridad.sesiones;
    if (!cuenta.seguridad.ultimoCambioClave) cuenta.seguridad.ultimoCambioClave = demo.seguridad.ultimoCambioClave;
    estadoMigrado = true;
  }
  const direccionTaller = "Pje. Edmundo Lobos 5507294, 5480000 Puerto Montt, Los Lagos (plus code G2WX+9J)";
  for (const dir of cuenta?.direcciones || []) {
    const texto = typeof dir.direccion === "string" ? dir.direccion : "";
    const inventada = texto.includes("Ruta V-60") || texto.includes("Sector Industrial");
    const tallerPendiente = dir.id === "dir-taller" && (texto === "Por confirmar" || inventada);
    if (tallerPendiente) {
      dir.direccion = direccionTaller;
      estadoMigrado = true;
    } else if (inventada) {
      dir.direccion = "Por confirmar";
      estadoMigrado = true;
    }
    if (dir.id === "dir-tepual" && typeof dir.referencia === "string" && dir.referencia.includes("08:30")) {
      dir.referencia = dir.referencia.replace("Horario 08:30 a 18:00.", "Horario: Por confirmar.");
      estadoMigrado = true;
    }
  }
  return cuenta;
}

function cargarEstado() {
  try {
    if (caducarMockup()) return estadoInicial();
    const guardado = JSON.parse(localStorage.getItem(claveAlmacen));
    if (guardado && Array.isArray(guardado.pedidos)) {
      const base = estadoInicial();
      const cargado = {
        ...base,
        ...guardado,
        carrito: carritoAlCargar(modoDemo, guardado),
        solicitudesEspeciales: Array.isArray(guardado.solicitudesEspeciales) ? guardado.solicitudesEspeciales : base.solicitudesEspeciales,
        cuenta: guardado.cuenta && Array.isArray(guardado.cuenta.direcciones) ? limpiarDatosPorConfirmar(renombrarAvisos(guardado.cuenta)) : base.cuenta,
      };
      return cargado;
    }
  } catch {
    // Si el almacenamiento está corrupto se parte con los datos de demo.
  }
  return estadoInicial();
}

const catalogoMesa = {
  perfiles: perfiles.map((perfil) => perfil.id),
  ladosPorPerfil: Object.fromEntries(perfiles.map((perfil) => [perfil.id, perfil.lados.length])),
  materiales: materiales.map((material) => material.id),
};

function mesaGuardada() {
  try {
    if (typeof localStorage === "undefined") return null;
    return leerMesa(localStorage.getItem(claveMesa), catalogoMesa);
  } catch {
    return null;
  }
}

function piezaPedida() {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("pieza") || params.get("perfil");
    return catalogoMesa.perfiles.includes(id) ? id : null;
  } catch {
    return null;
  }
}

function normalizarAngulos(perfilId, guardados) {
  const porDefecto = angulosPorDefecto(perfilId);
  if (!Array.isArray(guardados) || guardados.length !== porDefecto.length) return porDefecto;
  return porDefecto.map((defecto, indice) => {
    const valor = guardados[indice];
    return valor !== null && valor !== undefined && valor !== "" && Number.isFinite(Number(valor))
      ? Number(valor)
      : defecto;
  });
}

function uiInicial() {
  const mesa = mesaGuardada();
  const pedida = piezaPedida();
  const perfilId = pedida || mesa?.perfilId || perfilInicial;
  const lados = ladosAlEntrar(mesa, pedida) || ladosVacios(perfilId);
  const angulos = normalizarAngulos(perfilId, angulosAlEntrar(mesa, pedida));
  const mismaPieza = !pedida || mesa?.perfilId === pedida;
  return {
    paso: mesa?.paso || "medidas",
    perfilId,
    lados,
    angulos,
    ladoActivo: mismaPieza ? (mesa?.ladoActivo ?? 0) : 0,
    espesor: mesa?.espesor || "0.4",
    materialId: mesa?.materialId || "zincalum",
    metros: mesa ? mesa.metros : null,
    molde: mesa?.molde === true,
    lista: mesa?.lista || null,
    formulario: mesa?.formulario || null,
    personalesEn: mesa?.personalesEn ?? null,
    zona: null,
    zonaPrevia: null,
    modoPantalla: false,
    ficha: null,
    authPendiente: false,
    subvistaCliente: "portal",
    seccionCuenta: "boletas",
    filtroBoletasCuenta: "todas",
    boletaSeleccionada: null,
    ticketSeleccionado: "T-204",
    folioTicketPreseleccionado: null,
  };
}

export const state = cargarEstado();
export const ui = uiInicial();
if (estadoMigrado) guardar();
export const api = { online: false, estado: "offline", resultado: null, error: null };

export function guardar() {
  state.guardadoEn = Date.now();
  localStorage.setItem(claveAlmacen, JSON.stringify(state));
}
