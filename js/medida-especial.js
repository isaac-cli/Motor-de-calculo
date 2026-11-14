// Medida especial (solo mockup local).
import { validarSolicitudEspecial, validarAdjuntoEspecial } from "./cotizador.js?v=3";
import { crearSolicitudEspecial } from "./demo/mockData.js?v=3";
import { claveAlmacen, state } from "./estado.js?v=3";
import { $, dom } from "./dom.js?v=3";

let urlAdjuntoEspecial = null;
let errorAdjuntoEspecial = "";
let adjuntoEspecialCargando = false;
let especialValidado = false;

function errorCampoEspecial(campo, mensaje = "") {
  const control = dom.formEspecial.elements.namedItem(campo);
  control.setAttribute("aria-invalid", String(Boolean(mensaje)));
  $(`#especial-error-${campo}`).textContent = mensaje;
}

export function quitarAdjuntoEspecial() {
  if (urlAdjuntoEspecial) URL.revokeObjectURL(urlAdjuntoEspecial);
  urlAdjuntoEspecial = null;
  errorAdjuntoEspecial = "";
  adjuntoEspecialCargando = false;
  $("#especial-imagen").onload = null;
  $("#especial-imagen").onerror = null;
  $("#especial-imagen").removeAttribute("src");
  $("#especial-preview").classList.add("hidden");
  $("#especial-quitar-adjunto").classList.add("hidden");
  $("#especial-archivo-nombre").textContent = "";
  dom.formEspecial.elements.adjunto.value = "";
  errorCampoEspecial("adjunto");
}

function prepararAdjuntoEspecial() {
  const archivo = dom.formEspecial.elements.adjunto.files[0];
  if (urlAdjuntoEspecial) URL.revokeObjectURL(urlAdjuntoEspecial);
  urlAdjuntoEspecial = null;
  adjuntoEspecialCargando = false;
  const imagen = $("#especial-imagen");
  imagen.onload = null;
  imagen.onerror = null;
  imagen.removeAttribute("src");
  $("#especial-preview").classList.add("hidden");
  errorAdjuntoEspecial = validarAdjuntoEspecial(archivo);
  $("#especial-quitar-adjunto").classList.toggle("hidden", !archivo);
  errorCampoEspecial("adjunto", errorAdjuntoEspecial);
  if (!archivo || errorAdjuntoEspecial) return;
  const url = URL.createObjectURL(archivo);
  urlAdjuntoEspecial = url;
  adjuntoEspecialCargando = true;
  imagen.onload = () => {
    if (urlAdjuntoEspecial !== url) return;
    adjuntoEspecialCargando = false;
    errorCampoEspecial("adjunto");
    $("#especial-preview").classList.remove("hidden");
  };
  imagen.onerror = () => {
    if (urlAdjuntoEspecial !== url) return;
    adjuntoEspecialCargando = false;
    errorAdjuntoEspecial = "No pudimos abrir esta imagen. Elige otra foto o quita el archivo seleccionado.";
    errorCampoEspecial("adjunto", errorAdjuntoEspecial);
    URL.revokeObjectURL(url);
    urlAdjuntoEspecial = null;
  };
  $("#especial-archivo-nombre").textContent = archivo.name;
  imagen.src = url;
}

function reiniciarFormularioEspecial() {
  dom.formEspecial.reset();
  quitarAdjuntoEspecial();
  especialValidado = false;
  dom.formEspecial.querySelectorAll("[name]").forEach((campo) => errorCampoEspecial(campo.name));
  $("#especial-estado-form").textContent = "";
  $("#especial-confirmacion").classList.add("hidden");
  dom.formEspecial.classList.remove("hidden");
}

export function abrirEspecial() {
  if (dom.formEspecial.classList.contains("hidden")) reiniciarFormularioEspecial();
  for (const campo of ["nombre", "telefono"]) {
    const control = dom.formEspecial.elements.namedItem(campo);
    if (!control.value && state.sesion?.[campo]) control.value = state.sesion[campo];
  }
  dom.modalEspecial.showModal();
  dom.modalEspecial.scrollTop = 0;
  dom.formEspecial.elements.descripcion.focus({ preventScroll: true });
}

function validarFormularioEspecial() {
  const resultado = validarSolicitudEspecial(Object.fromEntries(new FormData(dom.formEspecial)));
  if (errorAdjuntoEspecial) resultado.errores.adjunto = errorAdjuntoEspecial;
  else if (adjuntoEspecialCargando) resultado.errores.adjunto = "Espera a que termine de cargar la vista previa.";
  dom.formEspecial.querySelectorAll("[name]").forEach((campo) => {
    errorCampoEspecial(campo.name, resultado.errores[campo.name]);
  });
  return resultado;
}

async function enviarSolicitudEspecial(evento) {
  evento.preventDefault();
  if (dom.formEspecial.classList.contains("hidden")) return;
  especialValidado = true;
  const { datos, errores } = validarFormularioEspecial();
  const primerError = dom.formEspecial.querySelector('[aria-invalid="true"]');
  if (Object.keys(errores).length) {
    $("#especial-estado-form").textContent = "Revisa los campos marcados antes de enviar.";
    primerError?.focus();
    return;
  }
  const solicitudes = [...state.solicitudesEspeciales, crearSolicitudEspecial(datos)];
  try {
    localStorage.setItem(claveAlmacen, JSON.stringify({ ...state, solicitudesEspeciales: solicitudes }));
  } catch {
    $("#especial-estado-form").textContent = "No pudimos guardar la solicitud en este navegador. Revisa que el almacenamiento esté permitido e inténtalo de nuevo. Tus datos siguen en el formulario.";
    return;
  }
  state.solicitudesEspeciales = solicitudes;
  quitarAdjuntoEspecial();
  dom.formEspecial.classList.add("hidden");
  $("#especial-confirmacion").classList.remove("hidden");
  $("#especial-confirmacion").focus();
  const { renderSolicitudesEspeciales } = await import("./taller.js?v=3");
  dom.tallerEspeciales.innerHTML = renderSolicitudesEspeciales(state.solicitudesEspeciales);
}

export function conectarEventosEspecial() {
  dom.formEspecial.addEventListener("submit", enviarSolicitudEspecial);
  dom.formEspecial.addEventListener("input", (evento) => {
    if (evento.target.name === "adjunto") return;
    if (especialValidado) validarFormularioEspecial();
    $("#especial-estado-form").textContent = "";
  });
  dom.formEspecial.elements.adjunto.addEventListener("change", prepararAdjuntoEspecial);
  dom.modalEspecial.addEventListener("close", quitarAdjuntoEspecial);
}
