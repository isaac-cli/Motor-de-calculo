// Punto de entrada del frontend. Las funciones y variables usan camelCase.
import { tarifas, materiales, nombreMaterial } from "./cotizador.js?v=3";
import { usuarioDemo } from "./demo/mockData.js?v=3";
import { escaparHtml } from "./utils.js?v=3";
import { abrirNoSe, elegirProblema, imprimirResumen, marcarCotizacionLista, mostrarPaso } from "./pasos-cotizar.js?v=3";
import { guardar, modoDemo, state, ui } from "./estado.js?v=3";
import { camposPersonales, capturarFormulario, guardarMesa, olvidarPersonales, personalesVigentes, quitarDatosPersonales } from "./mesa-estado.js?v=3";
import { $, dom } from "./dom.js?v=3";
import { instalarPaginas } from "./paginas.js?v=3";
import { desplazarHasta, mostrarToast } from "./interfaz.js?v=3";
import { cambiarVista, cerrarMenu, renderSubvistaCliente, renderVista, toggleMenu } from "./vistas.js?v=3";
import { abrirAuth, cambiarTabAuth, cerrarSesion, iniciarSesion, renderSesion } from "./sesion.js?v=3";
import { zonaDePerfil } from "./zonas-obra.js?v=3";
import { obtenerPerfil, calcularPuntos, calcularTransformacionLienzo, perfilDesdeBusqueda } from "./perfiles.js?v=3";
import { activarReveal } from "./vida.js?v=3";
import {
  agregarAlCarrito,
  cargarPerfil,
  enfocarPrimerLado,
  limpiarMesa,
  restablecerAngulosMesa,
  renderEspesores,
  renderEsquema,
  renderMateriales,
  renderNombreMaterial,
  renderPrecio,
  renderResultado,
} from "./mesa.js?v=3";
import { confirmarCotizacion, irAlCarrito, quitarItem } from "./carrito.js?v=3";

// La casa 3D no entra aquí. Las zonas sí: el catálogo y el mapa las leen sin el visor.
void zonaDePerfil;

function accionTaller(nombre, ...args) {
  return import("./panel-taller.js?v=3").then((modulo) => modulo[nombre](...args));
}

let zonaPromesa;
function cargarZona() {
  zonaPromesa ??= import("./zona-cliente.js?v=3");
  return zonaPromesa;
}
function accionZona(nombre, ...args) {
  return cargarZona().then((modulo) => modulo[nombre](...args));
}

let formularioPromesa;
function cargarFormulario() {
  formularioPromesa ??= import("./cotizacion-formulario.js?v=3");
  return formularioPromesa;
}

let catalogoPromesa;
function cargarCatalogo() {
  catalogoPromesa ??= import("./catalogo.js?v=3");
  return catalogoPromesa;
}

let mapaPromesa;
function cargarMapa() {
  mapaPromesa ??= import("./mapa-obra.js?v=3").then((modulo) => {
    modulo.conectarEventosMapa();
    return modulo;
  });
  return mapaPromesa;
}

let especialPromesa;
let especialModulo;
function cargarEspecial() {
  if (especialModulo) return Promise.resolve(especialModulo);
  especialPromesa ??= import("./medida-especial.js?v=3").then((modulo) => {
    modulo.conectarEventosEspecial();
    especialModulo = modulo;
    return modulo;
  });
  return especialPromesa;
}
function abrirEspecial() {
  if (especialModulo) return especialModulo.abrirEspecial();
  return cargarEspecial().then((modulo) => modulo.abrirEspecial());
}

instalarPaginas();

// ---------------------------------------------------------------- Eventos

const acciones = {
  "cambiar-vista": (elemento) => cambiarVista(elemento.dataset.vista),
  "toggle-menu": toggleMenu,
  "cerrar-menu": cerrarMenu,
  "ir-carrito": () => {
    irAlCarrito();
    mostrarPaso("cotizacion");
  },
  "ir-paso": (elemento) => mostrarPaso(elemento.dataset.paso),
  "ir-datos": () => {
    cargarFormulario().then((modulo) => modulo.prepararFormularioCotizacion());
    mostrarPaso("datos");
  },
  "abrir-no-se": abrirNoSe,
  "elegir-problema": (elemento) => elegirProblema(elemento.dataset.problema),
  "cotizar-diagnostico": (elemento) => {
    document.querySelector("#no-se")?.close();
    if (elemento.dataset.especial === "1") abrirEspecial();
    else cargarPerfil(elemento.dataset.perfil, { desplazar: true });
  },
  "cerrar-no-se": () => document.querySelector("#no-se")?.close(),
  "abrir-auth": () => abrirAuth(),
  "cerrar-auth": () => dom.modalAuth.close(),
  "auth-tab": (elemento) => cambiarTabAuth(elemento.dataset.tab),
  "cerrar-sesion": cerrarSesion,
  "ir-medidas": enfocarPrimerLado,
  "ir-mapa": () => cargarMapa().then((modulo) => modulo.irAlMapa()),
  "fijar-zona": (elemento) => cargarMapa().then((modulo) => modulo.seleccionarZona(elemento.dataset.zona, { enfocar3D: true })),
  "cotizar-zona": (elemento) => cargarMapa().then((modulo) => {
    modulo.cotizarZona(elemento.dataset.perfil);
    mostrarPaso("medidas");
  }),
  "cargar-perfil": (elemento) => {
    document.querySelector("#detalle-pieza")?.close();
    cargarPerfil(elemento.dataset.perfil, { desplazar: true });
    mostrarPaso("medidas");
  },
  "seleccionar-perfil": (elemento) => cargarPerfil(elemento.dataset.perfil),
  "limpiar-mesa": limpiarMesa,
  "restablecer-angulos": restablecerAngulosMesa,
  "agregar-carrito": () => {
    const antes = state.carrito.length;
    agregarAlCarrito();
    if (state.carrito.length > antes) mostrarPaso("cotizacion");
  },
  "abrir-especial": abrirEspecial,
  "filtrar-catalogo": (elemento) => cargarCatalogo().then((modulo) => modulo.filtrarCatalogo(elemento.dataset.zona)),
  "ver-detalle-pieza": (elemento) => cargarCatalogo().then((modulo) => modulo.abrirDetallePieza(elemento.dataset.perfil)),
  "cerrar-detalle-pieza": () => document.querySelector("#detalle-pieza")?.close(),
  "cerrar-especial": () => dom.modalEspecial.close(),
  "quitar-adjunto-especial": () => cargarEspecial().then((modulo) => modulo.quitarAdjuntoEspecial()),
  "ver-especiales": () => {
    dom.modalEspecial.close();
    Promise.resolve(cambiarVista("taller")).then(() => {
      const titulo = $("#titulo-bandeja");
      if (!titulo) return;
      titulo.setAttribute("tabindex", "-1");
      titulo.focus({ preventScroll: true });
      desplazarHasta(titulo, "start");
    });
  },
  "quitar-item": (elemento) => quitarItem(elemento.dataset.item),
  "confirmar-cotizacion": confirmarCotizacion,
  "imprimir-resumen": () => imprimirResumen(),
  "enviar-taller": () => {
    soltarDatosPersonales();
    mostrarToast("Envío por confirmar", "La cotización sigue en este navegador. El aviso por correo al taller todavía no existe.", "info");
  },
  "aprobar-pedido": () => {
    mostrarToast("Aprobación por confirmar", "Crear el pedido espera una cuenta real. Esta pantalla es una demostración.", "info");
  },
  "poner-precio": () => {
    mostrarToast("Revisión técnica", "El taller revisa la pieza especial solicitada.", "info");
  },
  "abrir-cuenta": (elemento) => accionZona("abrirCuenta", { seccion: elemento.dataset.seccion || "boletas" }),
  "abrir-boleta-cuenta": (elemento) => accionZona("abrirCuenta", { seccion: "boletas", folio: elemento.dataset.folio }),
  "volver-portal": () => accionZona("volverAlPortal"),
  "volver-cotizador": () => accionZona("volverAlPortal", "#cotizador"),
  "cambiar-seccion-cuenta": (elemento) => {
    ui.seccionCuenta = elemento.dataset.seccion;
    renderSubvistaCliente();
  },
  "filtrar-boletas-cuenta": (elemento) => {
    ui.filtroBoletasCuenta = elemento.dataset.filtro;
    renderSubvistaCliente();
  },
  "ver-boleta": (elemento) => accionZona("verBoleta", elemento.dataset.folio),
  "seleccionar-boleta": (elemento) => accionZona("seleccionarBoleta", elemento.dataset.folio),
  "imprimir-boleta": (elemento) => accionZona("imprimirBoleta", elemento.dataset.folio),
  "consultar-boleta-ticket": (elemento) => accionZona("consultarBoletaTicket", elemento.dataset.folio),
  "marcar-direccion-principal": (elemento) => accionZona("marcarDireccionPrincipal", elemento.dataset.id),
  "eliminar-direccion": (elemento) => accionZona("eliminarDireccionCuenta", elemento.dataset.id),
  "cerrar-otras-sesiones": () => accionZona("cerrarOtrasSesiones"),
  "seleccionar-ticket": (elemento) => {
    ui.ticketSeleccionado = elemento.dataset.ticket;
    renderSubvistaCliente();
  },
  "cambiar-estado-ticket": (elemento) => accionZona("cambiarEstadoTicket", elemento.dataset.ticket),
  "simular-respuesta-taller": (elemento) => accionZona("simularRespuestaTaller", elemento.dataset.ticket),
  "ver-demo-logueado": () => accionZona("verDemoLogueado"),
  "cerrar-lote": () => accionTaller("cerrarLote"),
  "avanzar-pedido": (elemento) => accionTaller("avanzarPedido", elemento.dataset.folio),
  "abrir-ficha": (elemento) => accionTaller("abrirFicha", elemento.dataset.folio),
  "cerrar-ficha": () => dom.modalFicha.close(),
  "ficha-anterior": () => accionTaller("moverFicha", -1),
  "ficha-siguiente": () => accionTaller("moverFicha", 1),
  "marcar-cortada": () => accionTaller("marcarCortada"),
  "ficha-listo": () => accionTaller("fichaAListo"),
  "toggle-modo-pantalla": () => accionTaller("toggleModoPantalla"),
};

document.addEventListener("click", (evento) => {
  const enlaceSeccion = evento.target.closest('a[href^="#"]');
  if (enlaceSeccion && ui.subvistaCliente === "cuenta") {
    evento.preventDefault();
    const destino = enlaceSeccion.getAttribute("href");
    cerrarMenu();
    accionZona("volverAlPortal", destino);
    return;
  }

  const elemento = evento.target.closest("[data-action]");
  if (!elemento) return;
  const enlace = evento.target.closest("a[href]");
  if (enlace && enlace !== elemento && elemento.contains(enlace)) return;
  acciones[elemento.dataset.action]?.(elemento, evento);
});

dom.mesaLados.addEventListener("input", (evento) => {
  const { lado } = evento.target.dataset;
  if (lado === undefined) return;
  const indice = Number(lado);
  ui.lados[indice] = evento.target.value === "" ? null : Number(evento.target.value);
  ui.ladoActivo = indice;
  renderResultado();
  guardarMesa(ui);
});

dom.mesaLados.addEventListener("focusin", (evento) => {
  const { lado } = evento.target.dataset;
  if (lado === undefined || Number(lado) === ui.ladoActivo) return;
  ui.ladoActivo = Number(lado);
  renderEsquema();
  guardarMesa(ui);
});

// Arrastre interactivo de lados y pliegues directamente en el SVG con el mouse o pantalla táctil
let arrastreSvg = null;

dom.mesaSvg.addEventListener("pointerdown", (evento) => {
  const objetivo = evento.target.closest("[data-drag-lado]");
  if (!objetivo) return;
  evento.preventDefault();
  const indice = Number(objetivo.dataset.dragLado);
  const pivoteX = Number(objetivo.dataset.pivoteX);
  const pivoteY = Number(objetivo.dataset.pivoteY);
  const invertir = objetivo.dataset.invertir === "1";

  const perfil = obtenerPerfil(ui.perfilId);
  const puntosCrudos = calcularPuntos(perfil, ui.lados, ui.angulos);
  const transformacionBase = calcularTransformacionLienzo(puntosCrudos, 440, 280, 58);

  arrastreSvg = {
    pointerId: evento.pointerId,
    indice,
    pivoteX,
    pivoteY,
    invertir,
    transformacionBase,
  };
  ui.ladoActivo = indice;
  ui.transformacionLienzo = { ...transformacionBase };
  try {
    dom.mesaSvg.setPointerCapture(evento.pointerId);
  } catch {
    // Ignorar si el navegador no soporta captura en este contenedor
  }
  renderEsquema();
});

dom.mesaSvg.addEventListener("pointermove", (evento) => {
  if (!arrastreSvg || evento.pointerId !== arrastreSvg.pointerId) return;
  const svg = dom.mesaSvg.querySelector("svg");
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const cursorX = ((evento.clientX - rect.left) / rect.width) * 440;
  const cursorY = ((evento.clientY - rect.top) / rect.height) * 280;
  const { indice, pivoteX, pivoteY, invertir, transformacionBase } = arrastreSvg;

  const dx = invertir ? pivoteX - cursorX : cursorX - pivoteX;
  const dy = invertir ? pivoteY - cursorY : cursorY - pivoteY;
  if (Math.hypot(dx, dy) < 4) return;

  let grados = (Math.atan2(-dy, dx) * 180) / Math.PI;
  grados = Math.round(grados * 10) / 10;
  ui.angulos[indice] = grados;
  ui.ladoActivo = indice;

  if (invertir) {
    const perfil = obtenerPerfil(ui.perfilId);
    const nuevosPuntos = calcularPuntos(perfil, ui.lados, ui.angulos);
    ui.transformacionLienzo = {
      ...transformacionBase,
      desfaseX: pivoteX - (nuevosPuntos[1].x - transformacionBase.minX) * transformacionBase.escala,
      desfaseY: pivoteY - (transformacionBase.maxY - nuevosPuntos[1].y) * transformacionBase.escala,
    };
  }
  renderEsquema();
});

function finalizarArrastreSvg(evento) {
  if (!arrastreSvg || (evento && evento.pointerId !== undefined && evento.pointerId !== arrastreSvg.pointerId)) return;
  arrastreSvg = null;
  ui.transformacionLienzo = null;
  renderEsquema();
  guardarMesa(ui);
}

dom.mesaSvg.addEventListener("pointerup", finalizarArrastreSvg);
dom.mesaSvg.addEventListener("pointercancel", finalizarArrastreSvg);

dom.mesaEspesores.addEventListener("change", (evento) => {
  ui.espesor = evento.target.value;
  renderPrecio();
  guardarMesa(ui);
});

dom.mesaMateriales.addEventListener("change", (evento) => {
  ui.materialId = evento.target.value;
  renderNombreMaterial();
  renderPrecio();
  guardarMesa(ui);
});

dom.mesaMetros.addEventListener("input", () => {
  ui.metros = dom.mesaMetros.value === "" ? null : Number(dom.mesaMetros.value);
  renderPrecio();
  guardarMesa(ui);
});

dom.mesaMolde.addEventListener("change", () => {
  ui.molde = dom.mesaMolde.checked;
  renderPrecio();
  guardarMesa(ui);
});

dom.formLogin.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const email = new FormData(dom.formLogin).get("email").trim().toLowerCase();
  const nombre = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (letra) => letra.toUpperCase());
  iniciarSesion(email === usuarioDemo.email ? usuarioDemo : { nombre, email, telefono: "+56 9 0000 0000" });
});

dom.formRegistro.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const datos = new FormData(dom.formRegistro);
  iniciarSesion({
    nombre: datos.get("nombre").trim(),
    email: datos.get("email").trim().toLowerCase(),
    telefono: datos.get("telefono").trim(),
  });
  dom.formRegistro.reset();
});

// Formularios y controles delegados de la Zona Administrativa del Cliente
dom.vistaCuenta.addEventListener("submit", (evento) => {
  const form = evento.target;
  if (form.id === "form-datos-cuenta") {
    evento.preventDefault();
    accionZona("guardarDatosCuenta", form);
  } else if (form.id === "form-nueva-direccion") {
    evento.preventDefault();
    accionZona("agregarDireccionCuenta", form);
  } else if (form.id === "form-clave-cuenta") {
    evento.preventDefault();
    accionZona("cambiarClaveCuenta", form);
  } else if (form.id === "form-nuevo-ticket") {
    evento.preventDefault();
    accionZona("crearNuevoTicket", form);
  } else if (form.id === "form-respuesta-ticket") {
    evento.preventDefault();
    accionZona("responderTicket", form);
  }
});

dom.vistaCuenta.addEventListener("change", (evento) => {
  const checkNotif = evento.target.closest("[data-notificacion-cuenta]");
  if (checkNotif) {
    const clave = checkNotif.dataset.notificacionCuenta;
    state.cuenta.seguridad.notificaciones[clave] = checkNotif.checked;
    guardar();
    mostrarToast("Preferencia de aviso guardada", checkNotif.checked ? "Notificación activada." : "Notificación silenciada.", "info");
    return;
  }

  const selectObra = evento.target.closest("[data-select-obra-folio]");
  if (selectObra) {
    const folio = selectObra.dataset.selectObraFolio;
    const pedido = state.pedidos.find((p) => p.folio === folio);
    if (pedido) {
      pedido.obra = selectObra.value;
      guardar();
      renderSubvistaCliente();
      mostrarToast(`Obra asignada a ${pedido.folio}`, `Destino: ${pedido.obra}`);
    }
  }
});

dom.modalAuth.addEventListener("click", (evento) => {
  if (evento.target === dom.modalAuth) dom.modalAuth.close();
});

dom.modalAuth.addEventListener("close", () => {
  ui.authPendiente = false;
});

dom.modalFicha.addEventListener("keydown", (evento) => {
  if (evento.key === "ArrowRight") accionTaller("moverFicha", 1);
  if (evento.key === "ArrowLeft") accionTaller("moverFicha", -1);
});

dom.modalFicha.addEventListener("close", () => {
  ui.ficha = null;
});

// ---------------------------------------------------------------- Inicio

// Parte el arranque en tareas cortas. scheduler.yield cede el hilo; sin eso, setTimeout.
function ceder() {
  if (typeof scheduler !== "undefined" && typeof scheduler.yield === "function") return scheduler.yield();
  return new Promise((resolver) => { setTimeout(resolver, 0); });
}

async function iniciar() {
  document.querySelectorAll("[data-solo-demo]").forEach((elemento) => {
    elemento.classList.toggle("hidden", !modoDemo);
    elemento.hidden = !modoDemo;
  });
  // Fuera de ?demo nadie debe quedar en la vista taller guardada en el navegador.
  if (!modoDemo) state.vista = "cliente";
  dom.mesaMetros.value = ui.metros == null ? "" : String(ui.metros);
  dom.mesaMolde.checked = ui.molde === true;
  renderEspesores();
  renderMateriales();
  cargarPerfil(ui.perfilId, { conservar: true });
  renderSesion();
  await ceder();
  const formulario = await cargarFormulario();
  formulario.iniciarFormularioCotizacion({
    obtenerCarrito: () => state.carrito,
    obtenerCliente: () => ({
      nombre_cliente: state.sesion?.razonSocial || state.sesion?.nombre || "",
      telefono: state.sesion?.telefono || "",
      correo: state.sesion?.email || "",
    }),
    alGuardar: (cotizacion) => marcarCotizacionLista(cotizacion),
  });
  dom.formEspecial.elements.material.innerHTML = '<option value="recomendar">No sé / que me recomienden</option>'
    + materiales.map((material) => `<option value="${material.id}">${escaparHtml(nombreMaterial(material.id))}</option>`).join("")
    + '<option value="otro">Otro (indícalo en la descripción)</option>';
  dom.formEspecial.elements.espesor.innerHTML = '<option value="recomendar">No sé / que me recomienden</option>'
    + Object.values(tarifas).map((tarifa) => `<option value="${tarifa.espesor}">${tarifa.etiqueta.replace(".", ",")}</option>`).join("")
    + '<option value="otro">Otro (indícalo en la descripción)</option>';
  aplicarFormularioGuardado();
  await cargarEspecial();
  renderVista();
  await ceder();
  const mapa = await cargarMapa();
  mapa.renderMapaObra();
  const catalogo = await cargarCatalogo();
  catalogo.programarCatalogo();
  await abrirPiezaDesdePortada();
  // Fase de mockup: no sondear ni enviar cotizaciones a un backend real.
}

// La portada abre el cotizador con una pieza elegida (?pieza=canaleta) o con la pieza especial (?especial).
async function abrirPiezaDesdePortada() {
  const busqueda = window.location.search;
  const pieza = perfilDesdeBusqueda(busqueda);
  const params = new URLSearchParams(busqueda);
  if (pieza) {
    cargarPerfil(pieza, { conservar: true, desplazar: true });
    mostrarPaso("medidas");
  } else if (params.has("especial")) await abrirEspecial();
  else if (params.has("nose") || window.location.hash === "#no-se") abrirNoSe();
  else if (window.location.hash === "#cotizador") mostrarPaso("cotizacion", { desplazar: false, enfocar: false, avisar: false });
  else if (ui.paso && ui.paso !== "medidas" && window.location.hash !== "#ingresar" && window.location.hash !== "#cuenta") {
    if (ui.paso === "lista" && ui.lista) marcarCotizacionLista(ui.lista, { desplazar: false, enfocar: false, avisar: false });
    else mostrarPaso(ui.paso, { desplazar: false, enfocar: false, avisar: false });
  }
  // Lo que ya está escrito en el HTML (por ejemplo los costados «Cómo sigue»); lo que se pinta después llama a lo suyo.
  activarReveal(document);
}

function anotarFormulario(form) {
  if (Number.isFinite(ui.personalesEn) && !personalesVigentes(ui.personalesEn)) {
    for (const campo of camposPersonales) {
      const control = form.elements.namedItem(campo);
      if (control && "value" in control) control.value = "";
    }
    ui.formulario = quitarDatosPersonales(ui.formulario);
    ui.personalesEn = null;
  }
  const anterior = camposPersonales.map((campo) => ui.formulario?.[campo] || "").join("\u0000");
  ui.formulario = capturarFormulario(form);
  const nuevo = camposPersonales.map((campo) => ui.formulario?.[campo] || "").join("\u0000");
  if (anterior !== nuevo) {
    ui.personalesEn = camposPersonales.some((campo) => ui.formulario?.[campo]) ? Date.now() : null;
  }
  guardarMesa(ui);
}

function soltarDatosPersonales() {
  if (ui.paso !== "lista") return;
  const form = document.querySelector("#form-cotizacion-pdf");
  if (form) {
    for (const campo of camposPersonales) {
      const control = form.elements.namedItem(campo);
      if (control && "value" in control) control.value = "";
    }
    ui.formulario = capturarFormulario(form);
  }
  olvidarPersonales(ui);
}

function aplicarFormularioGuardado() {
  const form = document.querySelector("#form-cotizacion-pdf");
  const datos = ui.formulario;
  if (!form || !datos) return;
  for (const [campo, valor] of Object.entries(datos)) {
    const control = form.elements.namedItem(campo);
    if (!control || control.type === "password" || control.type === "file") continue;
    if (control.type === "checkbox") control.checked = valor === true;
    else if (typeof valor === "string") control.value = valor;
  }
}

document.querySelector("#form-cotizacion-pdf")?.addEventListener("input", (evento) => {
  if (evento.target.type === "password" || evento.target.type === "file") return;
  anotarFormulario(evento.currentTarget);
});

document.addEventListener("click", (evento) => {
  const enlace = evento.target.closest("#lista-pdf, #resumen-pdf");
  if (!enlace || ui.paso !== "lista") return;
  soltarDatosPersonales();
});

document.addEventListener("colegual:mi-cotizacion", () => {
  mostrarPaso("cotizacion", { desplazar: false, enfocar: false, avisar: false });
  irAlCarrito();
});

document.addEventListener("colegual:cotizar", () => {
  mostrarPaso("medidas", { enfocar: false, avisar: false });
});

window.addEventListener("pagehide", () => {
  const form = document.querySelector("#form-cotizacion-pdf");
  if (form) anotarFormulario(form);
  else guardarMesa(ui);
  guardar();
});

iniciar();

// Entrada a la cuenta desde la portada de la empresa (solo con ?demo: el login aún es simulado).
function abrirDesdePortada() {
  if (window.location.hash === "#ingresar") abrirAuth();
  if (modoDemo && window.location.hash === "#cuenta") accionZona("abrirCuenta", {});
}
abrirDesdePortada();
window.addEventListener("hashchange", abrirDesdePortada);
