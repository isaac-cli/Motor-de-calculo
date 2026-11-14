// Utilidades de interfaz: avisos (toasts), resaltado, desplazamiento y textos cortos.
import { escaparHtml } from "./utils.js?v=3";
import { dom } from "./dom.js?v=3";

const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function primerNombre(nombre) {
  return String(nombre).trim().split(/\s+/)[0] ?? "";
}

export function horaActual() {
  return new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

export function mostrarToast(titulo, detalle = "", tipo = "ok") {
  // Tema claro: tarjeta blanca con un borde de color a la izquierda según el tipo.
  const estilos = {
    ok: { borde: "border-l-emerald-600", icono: "bg-emerald-700 text-white", simbolo: "✓" },
    info: { borde: "border-l-[#1E293B]", icono: "bg-navy text-white", simbolo: "i" },
    alerta: { borde: "border-l-[#D97706]", icono: "bg-accent text-ink", simbolo: "!" },
  };
  const estilo = estilos[tipo] ?? estilos.ok;
  const toast = document.createElement("div");
  toast.className = `pointer-events-auto flex motion-safe:animate-toast-in gap-3 rounded-lg border border-l-4 border-slate-200 ${estilo.borde} bg-white p-4 text-lg text-ink shadow-lg`;
  toast.innerHTML = `
    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base font-black ${estilo.icono}">${estilo.simbolo}</span>
    <span class="min-w-0">
      <span class="block font-semibold">${escaparHtml(titulo)}</span>
      ${detalle ? `<span class="mt-0.5 block text-base text-slate-600">${escaparHtml(detalle)}</span>` : ""}
    </span>`;
  dom.toasts.append(toast);
  // Se queda 4 s y sale con un fundido de 200 ms (sin fundido si se pide menos movimiento).
  setTimeout(() => {
    if (movimientoReducido) {
      toast.remove();
      return;
    }
    toast.classList.add("toast-saliendo");
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

export function resaltar(elemento) {
  elemento.classList.add("ring-4", "ring-amber-400/60");
  setTimeout(() => elemento.classList.remove("ring-4", "ring-amber-400/60"), 1200);
}

export function desplazarHasta(elemento, bloque = "center") {
  elemento.scrollIntoView({ behavior: movimientoReducido ? "instant" : "smooth", block: bloque });
}
