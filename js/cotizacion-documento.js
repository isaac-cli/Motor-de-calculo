import { generarCotizacion, leerCotizaciones } from "./cotizacion-pdf.js?v=3";
import { olvidarPersonalesGuardados } from "./mesa-estado.js?v=3";

async function mostrarCotizacion() {
  try {
    const folio = new URLSearchParams(window.location.search).get("folio");
    const datos = leerCotizaciones().find((cotizacion) => cotizacion.folio === folio);
    if (!datos) throw new Error("Esta cotización no está guardada en este navegador.");
    const html = await generarCotizacion(datos);
    // El generador ya escapó cada dato del cliente. Conservamos el CSS de la plantilla.
    const documento = new DOMParser().parseFromString(html, "text/html");
    document.documentElement.replaceWith(document.importNode(documento.documentElement, true));
    // Añadimos la acción por JavaScript sin depender del onclick al importar el documento.
    const imprimir = document.getElementById("btn-pdf");
    imprimir.removeAttribute("onclick");
    imprimir.addEventListener("click", () => {
      olvidarPersonalesGuardados();
      window.print();
    });
  } catch (error) {
    document.querySelector("#estado").textContent = `${error.message} Puedes recargar para reintentar.`;
  }
}

mostrarCotizacion();
