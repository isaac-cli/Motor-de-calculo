// colegual.mockup.v2 caduca a los 7 días desde el último guardado.
// La forma que leen el panel y el contador (carrito, pedidos, cuenta) no cambia:
// solo se agrega guardadoEn. Si falta o está vencida, se borra la clave.
export const claveMockup = "colegual.matematicas.mockup.v1";
export const msMockup = 7 * 24 * 60 * 60 * 1000;

export function mockupVigente(guardadoEn, ahora = Date.now()) {
  return Number.isFinite(guardadoEn) && guardadoEn <= ahora && ahora - guardadoEn < msMockup;
}

export function caducarMockup(almacen = globalThis.localStorage, ahora = Date.now()) {
  if (!almacen || typeof almacen.getItem !== "function") return false;
  const texto = almacen.getItem(claveMockup);
  if (!texto) return false;
  let datos;
  try {
    datos = JSON.parse(texto);
  } catch {
    almacen.removeItem(claveMockup);
    return true;
  }
  if (!datos || typeof datos !== "object" || !mockupVigente(Number(datos.guardadoEn), ahora)) {
    almacen.removeItem(claveMockup);
    return true;
  }
  return false;
}
