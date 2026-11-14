// Medidas, ángulos, paso y datos del formulario de la pieza. Se guardan aparte del
// estado demo para que sobrevivan a una navegación y a la vuelta atrás.
export const claveMesa = "colegual.matematicas.mesa.v1";

export const pasosMesa = ["medidas", "cotizacion", "datos", "lista"];

const espesores = new Set(["0.4", "0.5"]);

const camposFormulario = [
  "nombre_cliente",
  "telefono",
  "correo",
  "trabajo_solicitado",
  "rut_cliente",
  "giro",
  "direccion",
  "comuna",
];

// Nombre, teléfono y dirección caducan a los 7 días. El trabajo pedido se queda.
export const camposPersonales = [
  "nombre_cliente",
  "telefono",
  "correo",
  "rut_cliente",
  "giro",
  "direccion",
  "comuna",
];

export const msDatosPersonales = 7 * 24 * 60 * 60 * 1000;

function textoPersonal(formulario) {
  const textos = {};
  for (const campo of camposPersonales) {
    const valor = formulario?.[campo];
    if (typeof valor === "string" && valor) textos[campo] = valor;
  }
  return textos;
}

function hayPersonales(formulario) {
  return Object.keys(textoPersonal(formulario)).length > 0;
}

export function personalesVigentes(personalesEn, ahora = Date.now()) {
  return Number.isFinite(personalesEn) && personalesEn <= ahora && ahora - personalesEn < msDatosPersonales;
}

function normalizarLista(lista) {
  if (!lista || typeof lista.folio !== "string" || !lista.folio.trim()) return null;
  const items = Array.isArray(lista.items)
    ? lista.items.slice(0, 40).map((item) => ({
      descripcion: typeof item?.descripcion === "string" ? item.descripcion.slice(0, 200) : "Pieza",
      cantidad: typeof item?.cantidad === "number" ? item.cantidad : 0,
      unidad: typeof item?.unidad === "string" ? item.unidad.slice(0, 20) : "m",
    }))
    : [];
  return {
    folio: lista.folio.slice(0, 40),
    total: typeof lista.total === "string" || typeof lista.total === "number" ? lista.total : null,
    items,
  };
}

function normalizarFormulario(formulario) {
  if (!formulario || typeof formulario !== "object") return null;
  const limpio = { necesita_factura: formulario.necesita_factura === true };
  for (const campo of camposFormulario) {
    if (typeof formulario[campo] === "string") limpio[campo] = formulario[campo].slice(0, 500);
  }
  return limpio;
}

// `texto` es el JSON guardado. `catalogo` trae los perfiles y materiales vigentes.
// Devuelve null si el dato no calza con el catálogo: se parte de cero, sin inventar medidas.
export function leerMesa(texto, catalogo) {
  if (!texto || !catalogo) return null;
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    return null;
  }
  if (!datos || typeof datos !== "object") return null;
  if (!catalogo.perfiles.includes(datos.perfilId)) return null;
  const esperado = catalogo.ladosPorPerfil[datos.perfilId];
  if (!Array.isArray(datos.lados) || datos.lados.length !== esperado) return null;
  const lados = datos.lados.map((lado) => {
    if (lado === null || lado === "") return null;
    const numero = Number(lado);
    return Number.isFinite(numero) ? numero : null;
  });
  const angulos =
    Array.isArray(datos.angulos) && datos.angulos.length === esperado
      ? datos.angulos.map((angulo) => {
          if (angulo === null || angulo === "") return null;
          const numero = Number(angulo);
          return Number.isFinite(numero) ? Math.max(-180, Math.min(180, numero)) : null;
        })
      : null;
  const lista = normalizarLista(datos.lista);
  let paso = pasosMesa.includes(datos.paso) ? datos.paso : "medidas";
  if (paso === "lista" && !lista) paso = "cotizacion";
  const metros = datos.metros === null || datos.metros === "" ? null : Number(datos.metros);
  const ladoActivo = Number(datos.ladoActivo);
  const personalesEn = Number(datos.personalesEn);
  const formulario = normalizarFormulario(datos.formulario);
  const caducados = Boolean(formulario && hayPersonales(datos.formulario) && !personalesVigentes(personalesEn));
  if (caducados) {
    for (const campo of camposPersonales) delete formulario[campo];
    purgarPersonalesGuardados(texto, datos);
  }
  return {
    paso,
    perfilId: datos.perfilId,
    lados,
    angulos,
    ladoActivo: Number.isInteger(ladoActivo) && ladoActivo >= 0 && ladoActivo < lados.length ? ladoActivo : 0,
    espesor: espesores.has(datos.espesor) ? datos.espesor : "0.4",
    materialId: catalogo.materiales.includes(datos.materialId) ? datos.materialId : catalogo.materiales[0],
    metros: Number.isFinite(metros) ? metros : null,
    molde: datos.molde === true,
    lista,
    formulario,
    personalesEn: formulario && hayPersonales(formulario) && personalesVigentes(personalesEn) ? personalesEn : null,
  };
}

// ?pieza=canaleta no borra el borrador de esa misma pieza. Otra pieza parte vacía.
export function ladosAlEntrar(mesa, piezaPedida) {
  if (!mesa || !Array.isArray(mesa.lados)) return null;
  if (piezaPedida && mesa.perfilId !== piezaPedida) return null;
  return mesa.lados;
}

export function angulosAlEntrar(mesa, piezaPedida) {
  if (!mesa || !Array.isArray(mesa.angulos)) return null;
  if (piezaPedida && mesa.perfilId !== piezaPedida) return null;
  return mesa.angulos;
}

export function quitarDatosPersonales(formulario) {
  if (!formulario || typeof formulario !== "object") return formulario || null;
  const copia = { ...formulario };
  for (const campo of camposPersonales) delete copia[campo];
  return copia;
}

// Al descargar o enviar, solo si la cotización ya está en el paso lista.
export function mesaTrasCierre(datos) {
  if (!datos || datos.paso !== "lista") return datos;
  return { ...datos, formulario: quitarDatosPersonales(datos.formulario), personalesEn: null };
}

export function capturarFormulario(form) {
  if (!form?.elements) return null;
  const limpio = { necesita_factura: form.elements.necesita_factura?.checked === true };
  for (const campo of camposFormulario) {
    const control = form.elements.namedItem(campo);
    if (!control || control.type === "password" || control.type === "file") continue;
    if (typeof control.value === "string") limpio[campo] = control.value.slice(0, 500);
  }
  return limpio;
}

function purgarPersonalesGuardados(texto, datos) {
  try {
    if (typeof localStorage === "undefined" || localStorage.getItem(claveMesa) !== texto) return;
    const formulario = { ...(datos.formulario || {}) };
    for (const campo of camposPersonales) delete formulario[campo];
    localStorage.setItem(claveMesa, JSON.stringify({ ...datos, formulario, personalesEn: null }));
  } catch {
    // Si no se puede escribir, la lectura igual devuelve el formulario ya sin esos campos.
  }
}

export function guardarMesa(ui, ahora = Date.now()) {
  if (ui?.formulario && hayPersonales(ui.formulario) && !personalesVigentes(ui.personalesEn, ahora)) {
    ui.formulario = quitarDatosPersonales(ui.formulario);
    ui.personalesEn = null;
  }
  try {
    localStorage.setItem(claveMesa, serializarMesa(ui));
  } catch {
    // El navegador puede bloquear el almacenamiento. La cotización sigue en memoria.
  }
}

export function olvidarPersonales(ui) {
  const cerrado = mesaTrasCierre(ui);
  if (cerrado === ui) return false;
  ui.formulario = cerrado.formulario;
  ui.personalesEn = null;
  guardarMesa(ui);
  return true;
}

export function purgarPersonalesSiCaducaron(almacen = globalThis.localStorage, ahora = Date.now()) {
  if (!almacen || typeof almacen.getItem !== "function") return false;
  const texto = almacen.getItem(claveMesa);
  if (!texto) return false;
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    return false;
  }
  if (!datos || typeof datos !== "object") return false;
  const formulario = datos.formulario;
  if (!formulario || typeof formulario !== "object" || !hayPersonales(formulario)) return false;
  if (personalesVigentes(Number(datos.personalesEn), ahora)) return false;
  for (const campo of camposPersonales) delete formulario[campo];
  datos.formulario = formulario;
  datos.personalesEn = null;
  try {
    almacen.setItem(claveMesa, JSON.stringify(datos));
  } catch {
    return false;
  }
  return true;
}

export function olvidarPersonalesGuardados() {
  try {
    const crudo = localStorage.getItem(claveMesa);
    if (!crudo) return false;
    const datos = JSON.parse(crudo);
    const cerrado = mesaTrasCierre(datos);
    if (cerrado === datos) return false;
    localStorage.setItem(claveMesa, JSON.stringify(cerrado));
    return true;
  } catch {
    return false;
  }
}

export function serializarMesa(ui) {
  const formulario = ui.formulario || null;
  const personalesEn = hayPersonales(formulario)
    ? (Number.isFinite(ui.personalesEn) ? ui.personalesEn : Date.now())
    : null;
  return JSON.stringify({
    paso: ui.paso,
    perfilId: ui.perfilId,
    lados: ui.lados,
    angulos: ui.angulos,
    ladoActivo: ui.ladoActivo,
    espesor: ui.espesor,
    materialId: ui.materialId,
    metros: ui.metros,
    molde: ui.molde === true,
    lista: ui.lista || null,
    formulario,
    personalesEn,
  });
}
