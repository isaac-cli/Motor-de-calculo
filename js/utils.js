// Utilidades compartidas de la interfaz.

function escaparHtml(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Los números de JavaScript ya son numéricos. En texto usamos el formato chileno:
// "1.000" = mil y "12,5" = doce y medio; rechazamos formatos ambiguos.
function numeroChileno(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : NaN;
  const texto = String(valor ?? "").trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(texto)) return NaN;
  return Number(texto.replace(/\./g, "").replace(",", "."));
}

// Hasta dos iniciales en mayúscula: "Juan Pérez Soto" → "JP".
function iniciales(nombre) {
  return String(nombre ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

export { escaparHtml, numeroChileno, iniciales };
