// Generador de orden técnica imprimible (proyecto de matemáticas, sin cálculos de dinero).
import { escaparHtml, numeroChileno } from "./utils.js?v=3";
import { nombreMaterial, describirTiras, formatoNumero } from "./cotizador.js?v=3";

const claveCotizaciones = "colegual.matematicas.cotizaciones.v1";
const validezDias = 15;

function validarRut(valor) {
  const texto = String(valor ?? "").trim();
  if (!/^(?:\d{1,8}|\d{1,2}(?:\.\d{3}){2})-?[\dkK]$/.test(texto)) return false;
  const limpio = texto.replace(/[.-]/g, "").toUpperCase();
  const cuerpo = limpio.slice(0, -1);
  if (!Number(cuerpo)) return false;
  let suma = 0;
  let factor = 2;
  for (const digito of [...cuerpo].reverse()) {
    suma += Number(digito) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return limpio.at(-1) === verificador;
}

function formatearRut(valor) {
  const limpio = valor.replace(/[.-]/g, "").toUpperCase();
  return `${Number(limpio.slice(0, -1)).toLocaleString("es-CL")}-${limpio.at(-1)}`;
}

function calcularTotales(items) {
  if (!Array.isArray(items) || !items.length) throw new Error("Agrega al menos una pieza a tu lista.");
  const filas = items.map((item, indice) => {
    const cantidad = numeroChileno(item.cantidad);
    const descripcion = String(item.descripcion ?? "").trim();
    const unidad = String(item.unidad ?? "").trim();
    const corte = String(item.corte ?? describirTiras(cantidad)).trim();
    if (!(cantidad > 0) || !Number.isFinite(cantidad) || !descripcion || !["m", "und", "hrs", "m²"].includes(unidad)) {
      throw new Error(`Revisa cantidad, unidad y descripción del ítem ${indice + 1}.`);
    }
    return { cantidad, descripcion, unidad, corte };
  });
  const metrosTotales = filas.filter((item) => item.unidad === "m").reduce((suma, item) => suma + item.cantidad, 0);
  return { items: filas, metrosTotales, neto: 0, iva: 0, total: metrosTotales };
}

function validarDatosCotizacion(entrada) {
  const datos = {};
  const errores = {};
  for (const campo of ["nombre_cliente", "rut_cliente", "direccion", "comuna", "giro", "telefono", "correo", "trabajo_solicitado"]) {
    datos[campo] = String(entrada[campo] ?? "").trim();
    if (datos[campo].length > 500) errores[campo] = "Usa hasta 500 caracteres.";
  }
  datos.necesita_factura = false;
  for (const campo of ["nombre_cliente", "telefono", "trabajo_solicitado"]) {
    if (!datos[campo]) errores[campo] = "Completa este campo.";
  }
  if (datos.rut_cliente) {
    if (!validarRut(datos.rut_cliente)) errores.rut_cliente = "Revisa el RUT y su dígito verificador.";
    else datos.rut_cliente = formatearRut(datos.rut_cliente);
  }
  const telefono = datos.telefono.replace(/[\s()-]/g, "");
  if (!/^(?:\+?56)?9\d{8}$/.test(telefono)) errores.telefono = "Ingresa un celular chileno, por ejemplo +56 9 1234 5678.";
  else {
    const nacional = telefono.slice(-9);
    datos.telefono = `+56 ${nacional[0]} ${nacional.slice(1, 5)} ${nacional.slice(5)}`;
  }
  if (datos.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo)) errores.correo = "Revisa el correo.";
  try {
    Object.assign(datos, calcularTotales(entrada.items));
  } catch (error) {
    errores.items = error.message;
  }
  return { datos, errores };
}

function itemsDesdeCarrito(carrito) {
  return carrito.flatMap((linea) => {
    const ladosTexto = Array.isArray(linea.lados)
      ? linea.lados.map((l) => `${formatoNumero(l.cm)} cm (${formatoNumero(l.angulo ?? 0, 0)}°)`).join(" + ")
      : "";
    const items = [{
      cantidad: linea.metros,
      unidad: "m",
      descripcion: `${linea.nombre} · ${nombreMaterial(linea.materialId)} · ${linea.espesor} mm · CM.D ${formatoNumero(linea.cmD)} cm [${ladosTexto}]`,
      corte: describirTiras(linea.metros),
    }];
    if (linea.molde) items.push({ cantidad: 1, unidad: "und", descripcion: `Molde en cartón · ${linea.nombre}`, corte: "Plantilla a escala" });
    return items;
  });
}

function renderizarPlantilla(plantilla, entrada) {
  const { datos, errores } = validarDatosCotizacion(entrada);
  if (Object.keys(errores).length) throw new Error(Object.values(errores)[0]);
  if (!/^C-\d{4,}$/.test(entrada.folio) || !/^\d{2}-\d{2}-\d{4}$/.test(entrada.fecha)) {
    throw new Error("El documento no tiene folio o fecha válidos.");
  }
  const campos = {
    ...datos, folio: entrada.folio, fecha: entrada.fecha, validez_dias: validezDias,
    giro: datos.giro || "—", rut_cliente: datos.rut_cliente || "—",
    direccion: datos.direccion || "—", comuna: datos.comuna || "—", correo: datos.correo || "—",
    total_items: String(datos.items.length),
    metros_totales: `${formatoNumero(datos.metrosTotales)} m`,
  };
  const reemplazarCampo = (valores) => (_, campo) => {
    if (!Object.hasOwn(valores, campo)) throw new Error(`Marcador desconocido: ${campo}`);
    return escaparHtml(valores[campo]);
  };
  return plantilla.replace(/{{#items}}([\s\S]*?){{\/items}}|{{(\w+)}}/g, (_, fila, campo) => {
    if (fila !== undefined) {
      return datos.items.map((item, indice) => fila.replace(/{{(\w+)}}/g, reemplazarCampo({
        ...item, n: indice + 1,
        cantidad: item.cantidad.toLocaleString("es-CL", { maximumFractionDigits: 10 }),
        corte: item.corte || "—",
      }))).join("");
    }
    return reemplazarCampo(campos)("", campo);
  });
}

async function generarCotizacion(datos) {
  const respuesta = await fetch(new URL("../plantilla-cotizacion.html", import.meta.url));
  if (!respuesta.ok) throw new Error("No pudimos cargar la plantilla. Inténtalo otra vez.");
  return renderizarPlantilla(await respuesta.text(), datos);
}

function leerCotizaciones(almacenamiento = localStorage) {
  const contenido = almacenamiento.getItem(claveCotizaciones);
  if (contenido === null) return [];
  const cotizaciones = JSON.parse(contenido);
  if (!Array.isArray(cotizaciones) || cotizaciones.some((cotizacion) => !/^C-\d{4,}$/.test(cotizacion?.folio))) {
    throw new Error("No se pudo leer el historial de órdenes. No se reemplazaron tus datos.");
  }
  return cotizaciones;
}

function fechaChilena(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric",
  }).formatToParts(fecha);
  const valor = (tipo) => partes.find((parte) => parte.type === tipo).value;
  return `${valor("day")}-${valor("month")}-${valor("year")}`;
}

async function guardarCotizacion(entrada, almacenamiento = localStorage) {
  const { datos, errores } = validarDatosCotizacion(entrada);
  if (Object.keys(errores).length) throw new Error(Object.values(errores)[0]);
  const guardar = async () => {
    const anteriores = leerCotizaciones(almacenamiento);
    const numero = anteriores.reduce((maximo, cotizacion) => Math.max(maximo, Number(cotizacion.folio.slice(2))), 0) + 1;
    if (!Number.isSafeInteger(numero)) throw new Error("No se pudo asignar el siguiente folio.");
    const cotizacion = { ...datos, folio: `C-${String(numero).padStart(4, "0")}`, fecha: fechaChilena(), validez_dias: validezDias };
    await generarCotizacion(cotizacion);
    almacenamiento.setItem(claveCotizaciones, JSON.stringify([...anteriores, cotizacion]));
    return cotizacion;
  };
  return globalThis.navigator?.locks
    ? navigator.locks.request(claveCotizaciones, guardar)
    : guardar();
}

export {
  generarCotizacion, renderizarPlantilla, guardarCotizacion, leerCotizaciones,
  validarDatosCotizacion, validarRut, numeroChileno, calcularTotales,
  itemsDesdeCarrito, fechaChilena,
};
