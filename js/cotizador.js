// Motor de cálculo geométrico y de cortes (proyecto de matemáticas).
// Desarrollo total: CM.D = suma de los lados (en cm).
// Tiras de plancha de 3 m: floor(metros / 3) tiras completas + resto.
import { numeroChileno } from "./utils.js?v=3";

const tarifas = {
  "0.4": { espesor: "0.4", etiqueta: "0.4 mm", precio: 0, referencial: false },
  "0.5": { espesor: "0.5", etiqueta: "0.5 mm", precio: 0, referencial: false },
};

const precioMoldeCarton = 0;

const plancha = { anchoCm: 122, largoM: 3 };

const materiales = [
  { id: "zincalum", tipo: "Zincalum", color: "Natural", muestra: "#C3C9CF" },
  { id: "prepintada-rojo", tipo: "Prepintada", color: "Rojo Colonial", muestra: "#8B2E24" },
  { id: "prepintada-verde", tipo: "Prepintada", color: "Verde Inglés", muestra: "#1F4D3A" },
  { id: "prepintada-grafito", tipo: "Prepintada", color: "Gris Grafito", muestra: "#3A3F45" },
  { id: "prepintada-blanco", tipo: "Prepintada", color: "Blanco Invierno", muestra: "#ECECE6" },
];

const limites = { ladoMaxCm: plancha.anchoCm, metrosMax: 500 };

function formatoClp(valor) {
  return `${Number(valor || 0).toLocaleString("es-CL", { maximumFractionDigits: 1 })} cm`;
}

function formatoNumero(valor, decimales = 1) {
  return Number(valor || 0).toLocaleString("es-CL", { maximumFractionDigits: decimales });
}

function obtenerMaterial(materialId) {
  return materiales.find((material) => material.id === materialId) ?? materiales[0];
}

function nombreMaterial(materialId) {
  const material = obtenerMaterial(materialId);
  return material.tipo === "Zincalum" ? "Zincalum" : `${material.tipo} ${material.color}`;
}

function calcularDesarrollo(ladosCm) {
  return ladosCm.reduce((suma, valor) => suma + (Number(valor) || 0), 0);
}

const MENSAJE_MEDIDAS_VACIAS = "Escribe las medidas para ver el desarrollo y cortes";

function cotizacionIncompleta({ ladosCm, metros }) {
  const lados = Array.isArray(ladosCm) ? ladosCm : [];
  const faltaLado = lados.length === 0 || lados.some((valor) => valor === null || valor === "");
  const faltanMetros = metros === null || metros === "" || metros === undefined;
  return faltaLado || faltanMetros;
}

function validarCotizacion({ ladosCm, metros }) {
  const errores = [];
  if (ladosCm.some((valor) => valor === null || valor === "" || Number.isNaN(Number(valor)))) {
    errores.push("Completa la medida de todos los lados.");
  }
  if (ladosCm.some((valor) => Number(valor) < 0)) {
    errores.push("Los lados no pueden ser negativos.");
  }
  const desarrollo = calcularDesarrollo(ladosCm);
  if (desarrollo > plancha.anchoCm) {
    errores.push(`El desarrollo (${formatoNumero(desarrollo)} cm) supera el ancho de plancha de ${plancha.anchoCm} cm.`);
  }
  if (!(Number(metros) > 0)) {
    errores.push("Indica los metros lineales (mayor que 0).");
  } else if (Number(metros) > limites.metrosMax) {
    errores.push(`Para más de ${limites.metrosMax} Mts revisa el cálculo directo con el taller.`);
  }
  return errores;
}

function calcularLocal({ ladosCm, espesor, metros, molde }) {
  const tarifa = tarifas[espesor] ?? tarifas["0.4"];
  const cmD = calcularDesarrollo(ladosCm);
  const metrosLineales = Number(metros) || 0;
  return {
    cmD,
    tarifa: 0,
    tarifaReferencial: tarifa.referencial,
    metros: metrosLineales,
    subtotalPlancha: 0,
    cargoMolde: molde ? 0 : 0,
    total: 0,
  };
}

function calcularTiras(metros) {
  const completas = Math.floor(metros / plancha.largoM);
  const resto = Math.round((metros - completas * plancha.largoM) * 100) / 100;
  return { completas, resto, total: completas + (resto > 0 ? 1 : 0) };
}

function describirTiras(metros) {
  const { completas, resto } = calcularTiras(metros);
  const partes = [];
  if (completas > 0) partes.push(`${completas} tira${completas === 1 ? "" : "s"} de ${plancha.largoM} m`);
  if (resto > 0) partes.push(`1 de ${formatoNumero(resto, 2)} m`);
  return partes.join(" + ") || "—";
}

function crearItemCotizacion({ perfil, ladosCm, angulos, espesor, materialId, metros, molde }) {
  const calculo = calcularLocal({ ladosCm, espesor, metros, molde });
  return {
    id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    perfilId: perfil.id,
    nombre: perfil.nombre,
    lados: perfil.lados.map((lado, indice) => ({
      letra: lado.letra,
      nombre: lado.nombre,
      cm: Number(ladosCm[indice]),
      angulo:
        angulos && angulos[indice] !== null && angulos[indice] !== undefined && angulos[indice] !== "" && Number.isFinite(Number(angulos[indice]))
          ? Number(angulos[indice])
          : lado.angulo,
    })),
    cmD: calculo.cmD,
    espesor,
    materialId,
    metros: calculo.metros,
    molde: Boolean(molde),
    tarifa: 0,
    tarifaReferencial: false,
    subtotal: 0,
    cortada: false,
  };
}

// Solicitudes a pedido: solo validación de dimensiones y ángulos.
function validarSolicitudEspecial(entrada) {
  const datos = Object.fromEntries(
    ["descripcion", "largo", "ancho", "alto", "cantidad", "unidad", "material", "espesor", "nombre", "telefono", "comuna"]
      .map((campo) => [campo, String(entrada[campo] ?? "").trim()])
  );
  const errores = {};
  for (const [campo, etiqueta, maximo] of [
    ["descripcion", "Describe la pieza que necesitas", 2000],
    ["nombre", "Indica tu nombre", 100],
    ["comuna", "Indica tu comuna", 100],
  ]) {
    if (!datos[campo]) errores[campo] = `${etiqueta}.`;
    else if (datos[campo].length > maximo) errores[campo] = `Usa hasta ${maximo} caracteres.`;
  }
  for (const campo of ["largo", "ancho", "alto", "cantidad"]) {
    const texto = datos[campo];
    const numero = /^\d+\.\d{1,2}$/.test(texto) ? Number(texto) : numeroChileno(texto);
    if (!texto && campo !== "cantidad") {
      datos[campo] = null;
    } else if (!(numero > 0)) {
      errores[campo] = "Ingresa un número mayor que 0, por ejemplo 150,5 o 1.000.";
    } else {
      datos[campo] = numero;
    }
  }
  if (!["unidades", "metros"].includes(datos.unidad)) errores.unidad = "Elige unidades o metros lineales.";
  if (datos.unidad === "unidades" && !errores.cantidad && !Number.isSafeInteger(datos.cantidad)) {
    errores.cantidad = "Para piezas, ingresa una cantidad entera.";
  }
  if (!["recomendar", "otro", ...materiales.map((material) => material.id)].includes(datos.material)) {
    errores.material = "Elige un material o pide una recomendación.";
  }
  if (!["recomendar", "otro", ...Object.keys(tarifas)].includes(datos.espesor)) {
    errores.espesor = "Elige un espesor o pide una recomendación.";
  }
  const telefono = datos.telefono.replace(/[\s()-]/g, "");
  if (!/^(?:\+?56)?[2-9]\d{8}$/.test(telefono)) {
    errores.telefono = "Ingresa un teléfono chileno de 9 dígitos, por ejemplo +56 9 1234 5678.";
  }
  datos.angulos = {};
  for (const campo of ["angulo_1", "angulo_2", "angulo_3"]) {
    const texto = String(entrada[campo] ?? "").trim();
    if (!texto) {
      datos.angulos[campo] = null;
      continue;
    }
    const numero = /^\d+\.\d{1,2}$/.test(texto) ? Number(texto) : numeroChileno(texto);
    if (!(numero > 0) || numero >= 360) errores[campo] = "Ingresa un ángulo en grados, por ejemplo 90.";
    else datos.angulos[campo] = numero;
  }
  return { datos, errores };
}

function validarAdjuntoEspecial(archivo) {
  if (!archivo) return "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
    return "Elige una imagen JPG, PNG o WebP de tu pieza o croquis.";
  }
  if (archivo.size > 5 * 1024 * 1024) return "La imagen debe pesar como máximo 5 MB.";
  return "";
}

export {
  tarifas,
  precioMoldeCarton,
  plancha,
  materiales,
  formatoClp,
  formatoNumero,
  obtenerMaterial,
  nombreMaterial,
  calcularDesarrollo,
  MENSAJE_MEDIDAS_VACIAS,
  cotizacionIncompleta,
  validarCotizacion,
  calcularLocal,
  calcularTiras,
  describirTiras,
  crearItemCotizacion,
  validarSolicitudEspecial,
  validarAdjuntoEspecial,
};
