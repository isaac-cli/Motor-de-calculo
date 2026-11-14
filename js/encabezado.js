// Menú, enlace activo y contador de piezas (sin referencias a precios).
(() => {
  "use strict";

  const menuButton = document.querySelector("#menu-toggle");
  const menu = document.querySelector("#mobile-menu");

  function setMenu(open) {
    if (!menu || !menuButton) return;
    menu.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }

  if (menuButton && menu) {
    menuButton.addEventListener("click", () => setMenu(menu.hidden));
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !menu.hidden) {
        setMenu(false);
        menuButton.focus();
      }
    });
    window.matchMedia("(min-width: 801px)").addEventListener("change", (event) => {
      if (event.matches) setMenu(false);
    });
  }

  const demo = new URLSearchParams(location.search).has("demo");
  document.querySelectorAll("[data-solo-demo]").forEach((element) => {
    element.hidden = !demo;
  });

  function enInicio() {
    return location.pathname === "/" || location.pathname.endsWith("/index.html");
  }

  function enCotizador() {
    return location.pathname.endsWith("/cotizador.html");
  }

  function marcar() {
    document.querySelectorAll(".desktop-links a").forEach((link) => {
      const url = new URL(link.href, location.href);
      const actual = enInicio() && url.hash && url.hash === location.hash;
      if (actual) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    document.querySelectorAll(".nav-cta").forEach((link) => {
      if (enCotizador()) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  window.addEventListener("hashchange", marcar);
  marcar();

  function leerCarrito() {
    try {
      const texto = localStorage.getItem("colegual.matematicas.mockup.v1");
      const guardado = JSON.parse(texto || "null");
      const marca = Number(guardado?.guardadoEn);
      const vigente = Number.isFinite(marca) && marca <= Date.now() && Date.now() - marca < 7 * 24 * 60 * 60 * 1000;
      if (!vigente) {
        if (texto) localStorage.removeItem("colegual.matematicas.mockup.v1");
        return [];
      }
      return Array.isArray(guardado?.carrito) ? guardado.carrito : [];
    } catch {
      return [];
    }
  }

  function escapar(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (caracter) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[caracter]));
  }

  function pintarPanel(dialogo) {
    const lineas = leerCarrito();
    const metros = lineas.reduce((acumulado, linea) => acumulado + (Number(linea.metros) || 0), 0);
    dialogo.querySelector("[data-panel-lista]").innerHTML = lineas.length
      ? lineas.map((linea) => `<li><span>${escapar(linea.nombre || "Pieza")}</span><span>CM.D ${escapar(linea.cmD ?? "—")} cm · ${escapar(linea.metros ?? "—")} m</span></li>`).join("")
      : "<li>Todavía no hay piezas en esta lista.</li>";
    dialogo.querySelector("[data-panel-total]").textContent = `${metros.toLocaleString("es-CL")} m`;
  }

  function asegurarPanel() {
    const existente = document.getElementById("panel-cotizacion");
    if (existente) return existente;
    const dialogo = document.createElement("dialog");
    dialogo.id = "panel-cotizacion";
    dialogo.className = "panel-cotizacion";
    dialogo.innerHTML = `<div class="panel-cotizacion-caja"><header><h2>Mi lista de piezas</h2><button type="button" data-cerrar-panel>Cerrar</button></header><ul data-panel-lista></ul><p>Largo total <strong data-panel-total>0 m</strong></p><a href="cotizador.html#cotizador">Ver mi lista</a></div>`;
    document.body.appendChild(dialogo);
    dialogo.querySelector("[data-cerrar-panel]").addEventListener("click", () => dialogo.close());
    dialogo.addEventListener("click", (evento) => {
      if (evento.target === dialogo) dialogo.close();
    });
    return dialogo;
  }

  function abrirPanelCotizacion(event) {
    if (enCotizador()) return false;
    const enlace = event.target.closest("a[href]");
    if (!enlace) return false;
    let destino;
    try {
      destino = new URL(enlace.href, location.href);
    } catch {
      return false;
    }
    if (!destino.pathname.endsWith("/cotizador.html") || destino.hash !== "#cotizador") return false;
    event.preventDefault();
    const dialogo = asegurarPanel();
    pintarPanel(dialogo);
    if (!dialogo.open) dialogo.showModal();
    return true;
  }

  document.addEventListener("click", (event) => {
    if (abrirPanelCotizacion(event)) return;
    const link = event.target.closest(".site-header a[href]");
    if (!link) return;
    let url;
    try {
      url = new URL(link.href, location.href);
    } catch {
      return;
    }
    if (url.origin !== location.origin) return;

    if (enInicio() && (url.pathname === "/" || url.pathname.endsWith("/index.html")) && url.hash) {
      event.preventDefault();
      setMenu(false);
      if (location.hash !== url.hash) location.hash = url.hash;
      else document.querySelector(url.hash)?.scrollIntoView();
      return;
    }

    if (!enCotizador() || !url.pathname.endsWith("/cotizador.html")) return;
    event.preventDefault();
    setMenu(false);
    if (url.hash === "#cotizador") {
      document.dispatchEvent(new CustomEvent("colegual:mi-cotizacion"));
      if (location.hash !== "#cotizador") location.hash = "#cotizador";
      return;
    }
    if (url.hash === "#ingresar" || url.hash === "#cuenta") {
      if (location.hash !== url.hash) location.hash = url.hash;
      else window.dispatchEvent(new HashChangeEvent("hashchange"));
      return;
    }
    if (!url.hash) {
      document.dispatchEvent(new CustomEvent("colegual:cotizar"));
      if (location.hash) history.pushState(null, "", `${location.pathname}${location.search}`);
      const destino = document.querySelector("#cotizador");
      if (destino) destino.scrollIntoView({ block: "start" });
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== "colegual.matematicas.mockup.v1") return;
    const cantidad = String(leerCarrito().length);
    document.querySelectorAll(".nav-cotizacion-n").forEach((nodo) => {
      nodo.textContent = cantidad;
    });
    const panel = document.getElementById("panel-cotizacion");
    if (panel?.open) pintarPanel(panel);
  });
})();
