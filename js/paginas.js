// Páginas propias bajo el encabezado: «No sé cómo se llama», Pieza especial e Ingresar.
// showModal, close y open siguen disponibles para no cambiar el resto de los módulos.

const IDS = ["no-se", "modal-especial", "modal-auth"];
const abiertas = new WeakMap();

function marcar(el, abierta) {
  abiertas.set(el, abierta);
  el.hidden = !abierta;
}

function mostrarPagina(el) {
  for (const id of IDS) {
    const otra = document.getElementById(id);
    if (otra && otra !== el && abiertas.get(otra)) cerrarPagina(otra);
  }
  marcar(el, true);
  document.body.dataset.pagina = el.id;
  window.scrollTo(0, 0);
  const titulo = el.querySelector("h2, h3");
  if (titulo) {
    titulo.setAttribute("tabindex", "-1");
    titulo.focus({ preventScroll: true });
  }
}

function cerrarPagina(el) {
  if (!abiertas.get(el)) return;
  marcar(el, false);
  if (document.body.dataset.pagina === el.id) delete document.body.dataset.pagina;
  el.dispatchEvent(new Event("close"));
}

export function instalarPaginas() {
  for (const id of IDS) {
    const el = document.getElementById(id);
    if (!el || el.dataset.paginaLista === "1") continue;
    el.dataset.paginaLista = "1";
    abiertas.set(el, false);
    Object.defineProperty(el, "open", {
      configurable: true,
      get() {
        return abiertas.get(el) === true;
      },
    });
    el.showModal = () => mostrarPagina(el);
    el.close = () => cerrarPagina(el);
  }

  document.addEventListener("keydown", (evento) => {
    if (evento.key !== "Escape") return;
    const id = document.body.dataset.pagina;
    if (!IDS.includes(id)) return;
    document.getElementById(id)?.close();
  });

  document.addEventListener("click", (evento) => {
    if (!document.body.dataset.pagina) return;
    const enlace = evento.target.closest('a[href^="#"]');
    if (!enlace) return;
    document.getElementById(document.body.dataset.pagina)?.close();
  });
}
