// Cliente de la API de FastAPI.
// URL del backend publicado en Vercel. Vacía mientras no exista: la página funciona sin API.
const apiPublicada = "";
const esLocal = ["127.0.0.1", "localhost"].includes(globalThis.location?.hostname);
// En local se usa el uvicorn de tu PC; publicada, la URL de Vercel.
const apiBaseUrl = esLocal ? "http://127.0.0.1:8000" : apiPublicada;

async function fetchConTiempoLimite(url, opciones = {}, milisegundos = 4000) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), milisegundos);
  try {
    return await fetch(url, { ...opciones, signal: controlador.signal });
  } finally {
    clearTimeout(temporizador);
  }
}

async function checkApiStatus() {
  if (!apiBaseUrl) return false;
  try {
    const response = await fetchConTiempoLimite(`${apiBaseUrl}/health`, {}, 2500);
    return response.ok;
  } catch {
    return false;
  }
}

function mensajeDeError(detalle) {
  if (typeof detalle === "string") return detalle;
  if (Array.isArray(detalle)) return detalle.map((error) => error.msg).join(" · ");
  return "La API rechazó la cotización.";
}

/**
 * Llama a POST /cotizaciones respetando el contrato actual del backend:
 * los tramos viajan en milímetros (`tramos_mm`) y el espesor como "0.4" / "0.5".
 */
async function cotizarEnApi({ perfilId, material, espesor, ladosCm, metros }) {
  if (!apiBaseUrl) throw new Error("La API todavía no está configurada.");
  const response = await fetchConTiempoLimite(`${apiBaseUrl}/cotizaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      perfil_id: perfilId,
      material,
      espesor,
      tramos_mm: ladosCm.map((cm) => Math.round(cm * 100) / 10),
      metros,
      cantidad: 1,
    }),
  });

  const datos = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(mensajeDeError(datos.detail));
  }
  return datos;
}

export { checkApiStatus, cotizarEnApi };
