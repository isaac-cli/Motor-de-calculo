// Movimiento compartido de la portada y el cotizador: aparición al hacer scroll, encabezado que reacciona al
// desplazarse (portada) y un parpadeo para cifras que cambian. Solo anima transform, translate y opacity.
// Con prefers-reduced-motion no oculta nada; sin JS todo queda visible (las clases las pone este archivo).

const PASOS_MAXIMOS = 6; // escalonado de hermanos: 6 × 70 ms = 420 ms como máximo
const RED_DE_SEGURIDAD_MS = 2500; // a los 2,5 s se muestra lo que ya pasó por la pantalla aunque el observador no haya avisado

const menosMovimiento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function escalonar(elemento) {
  const hermanos = [...elemento.parentElement.children].filter((hijo) => hijo.hasAttribute("data-reveal"));
  elemento.style.setProperty("--i", Math.min(hermanos.indexOf(elemento), PASOS_MAXIMOS));
}

const raicesVistas = new WeakSet();

// Observa los [data-reveal] de `raiz` y les pone .is-visible al entrar en pantalla. Si la misma raíz se vuelve a
// pintar (el tablero del taller, la cuenta), lo nuevo aparece de inmediato para no repetir la entrada en cada clic.
export function activarReveal(raiz = document) {
  if (menosMovimiento() || !("IntersectionObserver" in window)) return;
  // Un panel todavía oculto no tiene caja: observarlo aquí lo dejaría invisible al abrirse.
  if (raiz instanceof Element && raiz.getClientRects().length === 0) return;
  document.documentElement.classList.add("js-vida");
  const nuevos = raiz.querySelectorAll("[data-reveal]:not(.is-visible)");
  if (raicesVistas.has(raiz)) {
    nuevos.forEach((elemento) => elemento.classList.add("is-visible"));
    return;
  }
  raicesVistas.add(raiz);
  const observador = new IntersectionObserver((entradas) => entradas.forEach((entrada) => {
    if (!entrada.isIntersecting) return;
    entrada.target.classList.add("is-visible");
    observador.unobserve(entrada.target);
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  nuevos.forEach((elemento) => {
    escalonar(elemento);
    observador.observe(elemento);
  });
  // Red de seguridad: solo para lo que ya está en pantalla o más arriba. Lo que está más abajo sigue esperando el
  // scroll, para no perder la aparición de quien baja después de los 2,5 s.
  setTimeout(() => {
    const enVista = [];
    nuevos.forEach((elemento) => {
      if (!elemento.getClientRects().length || elemento.getBoundingClientRect().top >= innerHeight) return;
      enVista.push(elemento);
    });
    enVista.forEach((elemento) => {
      elemento.classList.add("is-visible");
      observador.unobserve(elemento);
    });
  }, RED_DE_SEGURIDAD_MS);
}

// Reinicia una animación corta (por ejemplo .precio-tick) cada vez que cambia una cifra.
export function marcarCambio(elemento, clase = "precio-tick") {
  if (!elemento || menosMovimiento()) return;
  elemento.classList.remove(clase);
  void elemento.offsetWidth;
  elemento.classList.add(clase);
}

// El encabezado marca .is-scrolled apenas la página baja; sirve igual con movimiento reducido.
function vigilarEncabezado() {
  const encabezado = document.querySelector(".site-header");
  if (!encabezado || encabezado.dataset.vigilado || !("IntersectionObserver" in window)) return;
  encabezado.dataset.vigilado = "1";
  const centinela = document.createElement("div");
  centinela.style.cssText = "position:absolute;top:0;height:1px;width:1px";
  centinela.setAttribute("aria-hidden", "true");
  document.body.prepend(centinela);
  new IntersectionObserver(([entrada]) => {
    const compacto = !entrada.isIntersecting;
    encabezado.classList.toggle("is-scrolled", compacto);
    encabezado.classList.toggle("is-compact", compacto);
  }, {
    rootMargin: "40px 0px 0px 0px",
  }).observe(centinela);
}

function iniciarPortada() {
  if (menosMovimiento() || !("IntersectionObserver" in window)) return;
  activarReveal();
  // Las tarjetas de piezas las escribe portada-piezas.js después.
  const piezas = document.getElementById("piezas");
  if (piezas) new MutationObserver(() => activarReveal(piezas)).observe(piezas, { childList: true });
  const fotos = document.querySelectorAll(".trabajos-grid img");
  if (fotos.length) {
    const fotosObs = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("is-revelada");
        fotosObs.unobserve(entrada.target);
      });
    }, { threshold: 0.25 });
    fotos.forEach((foto) => fotosObs.observe(foto));
  }
}

if (typeof document !== "undefined") {
  document.documentElement.classList.add("js-ready");
  if (document.querySelector(".site-header")) vigilarEncabezado();
  if (document.body?.classList.contains("portada")) iniciarPortada();
}
