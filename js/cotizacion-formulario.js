import {
  guardarCotizacion, leerCotizaciones, validarDatosCotizacion,
  itemsDesdeCarrito, calcularTotales,
} from "./cotizacion-pdf.js?v=3";
import { formatoNumero } from "./cotizador.js?v=3";

export const MENSAJE_QUE_PASA_AHORA = "El taller revisa tu orden de corte (medidas, ángulos y desarrollos) y te contacta.";

let prepararFormulario = () => {};

function prepararFormularioCotizacion() {
  prepararFormulario();
}

function iniciarFormularioCotizacion({ obtenerCarrito, obtenerCliente, alGuardar }) {
  const form = document.querySelector("#form-cotizacion-pdf");
  const estado = document.querySelector("#cotizacion-estado");
  const enviar = form.querySelector('[type="submit"]');
  let enviando = false;

  function enlaceDocumento(folio) {
    const enlace = document.createElement("a");
    enlace.href = `cotizacion.html?folio=${encodeURIComponent(folio)}`;
    enlace.target = "_blank";
    enlace.rel = "noopener";
    enlace.className = "flex min-h-12 items-center font-semibold underline underline-offset-4";
    enlace.textContent = `Abrir ficha de orden ${folio}`;
    return enlace;
  }

  function mostrarHistorial() {
    const contenedor = document.querySelector("#cotizaciones-guardadas");
    contenedor.replaceChildren();
    try {
      for (const cotizacion of leerCotizaciones().slice(-5).reverse()) {
        contenedor.append(enlaceDocumento(cotizacion.folio));
      }
    } catch {
      contenedor.textContent = "No se pudo leer el historial local. No se han borrado tus registros.";
    }
  }

  function actualizarObligatorios() {
    for (const nombre of ["rut_cliente", "direccion", "comuna"]) {
      const campo = form.elements.namedItem(nombre);
      if (!campo) continue;
      campo.required = Boolean(form.elements.necesita_factura?.checked);
      campo.setAttribute("aria-required", String(campo.required));
    }
  }

  function mostrarErrores(errores = {}) {
    form.querySelectorAll("[name]").forEach((campo) => {
      campo.setAttribute("aria-invalid", String(Boolean(errores[campo.name])));
      const mensaje = document.getElementById(`cotizacion-error-${campo.name}`);
      if (mensaje) mensaje.textContent = errores[campo.name] || "";
    });
    document.querySelector("#cotizacion-error-items").textContent = errores.items || "";
  }

  prepararFormulario = () => {
    estado.replaceChildren();
    mostrarErrores();
    actualizarObligatorios();
    const cliente = obtenerCliente();
    for (const [campo, valor] of Object.entries(cliente)) {
      const control = form.elements.namedItem(campo);
      if (control && !control.value) control.value = valor || "";
    }
    try {
      const { items, metrosTotales } = calcularTotales(itemsDesdeCarrito(obtenerCarrito()));
      document.querySelector("#cotizacion-resumen").textContent =
        `Resumen técnico: ${items.length} ${items.length === 1 ? "ítem" : "ítems"} · Total ${formatoNumero(metrosTotales)} metros lineales`;
      enviar.disabled = false;
    } catch (error) {
      document.querySelector("#cotizacion-resumen").textContent = error.message;
      enviar.disabled = true;
    }
  };
  form.elements.necesita_factura?.addEventListener("change", actualizarObligatorios);

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (enviando) return;
    const entrada = { ...Object.fromEntries(new FormData(form)), items: itemsDesdeCarrito(obtenerCarrito()) };
    const { datos, errores } = validarDatosCotizacion(entrada);
    mostrarErrores(errores);
    if (Object.keys(errores).length) {
      estado.textContent = "Revisa los campos marcados antes de guardar.";
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const ventana = window.open("", "_blank");
    if (ventana) {
      ventana.opener = null;
      ventana.document.title = "Preparando documento";
      ventana.document.body.textContent = "Preparando tu ficha técnica…";
    }
    enviando = true;
    enviar.disabled = true;
    estado.textContent = "Guardando ficha…";
    try {
      const cotizacion = await guardarCotizacion(datos);
      const enlace = enlaceDocumento(cotizacion.folio);
      estado.textContent = `Orden ${cotizacion.folio} guardada en este navegador. ${MENSAJE_QUE_PASA_AHORA} `;
      estado.append(enlace);
      mostrarHistorial();
      const quePasa = document.querySelector("#lista-que-pasa");
      if (quePasa) quePasa.textContent = MENSAJE_QUE_PASA_AHORA;
      alGuardar?.(cotizacion);
      if (ventana && !ventana.closed) ventana.location.replace(enlace.href);
      else estado.prepend("La ventana no se abrió. Usa Descargar PDF en el paso Lista. ");
    } catch (error) {
      ventana?.close();
      estado.textContent = `No se pudo guardar el registro. ${error.message} Tus datos siguen en el formulario; revisa el almacenamiento del navegador o reintenta.`;
    } finally {
      enviando = false;
      enviar.disabled = false;
    }
  });

  mostrarHistorial();
  window.addEventListener("storage", mostrarHistorial);
}

export { iniciarFormularioCotizacion, prepararFormularioCotizacion };
