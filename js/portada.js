(() => {
  "use strict";
  const INTERVALO_CARRUSEL_MS = 6000;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const slides = [...carousel.querySelectorAll("[data-slide]")];
    const dots = [...carousel.querySelectorAll("[data-dot]")];
    const caption = carousel.querySelector("p[data-caption]");
    const pauseButton = carousel.querySelector("[data-pause]");
    let current = 0;
    let paused = reducedMotion.matches;
    let hovering = false;
    let focused = false;
    let visible = true;
    let timer;

    function renderSlide(next, manual = false) {
      current = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== current; slide.classList.toggle("is-active", i === current); });
      dots.forEach((dot, i) => dot.setAttribute("aria-current", String(i === current)));
      caption.setAttribute("aria-live", manual ? "polite" : "off");
      caption.textContent = slides[current].dataset.caption;
      if (slides[current].dataset.location) {
        const locationLabel = document.createElement("span");
        locationLabel.textContent = ` · ${slides[current].dataset.location}`;
        caption.append(locationLabel);
      }
    }
    function schedule() {
      clearInterval(timer);
      if (pauseButton) {
        pauseButton.textContent = paused ? "▶" : "Ⅱ";
        pauseButton.setAttribute("aria-label", paused ? "Reanudar carrusel" : "Pausar carrusel");
        pauseButton.setAttribute("aria-pressed", String(paused));
      }
      if (pauseButton && !paused && !hovering && !focused && visible && !document.hidden) timer = setInterval(() => renderSlide(current + 1), INTERVALO_CARRUSEL_MS);
    }
    function navigate(next) { renderSlide(next, true); schedule(); }
    carousel.querySelector("[data-prev]").addEventListener("click", () => navigate(current - 1));
    carousel.querySelector("[data-next]").addEventListener("click", () => navigate(current + 1));
    dots.forEach((dot, i) => dot.addEventListener("click", () => navigate(i)));
    pauseButton?.addEventListener("click", () => { paused = !paused; schedule(); });
    carousel.addEventListener("mouseenter", () => { hovering = true; schedule(); });
    carousel.addEventListener("mouseleave", () => { hovering = false; schedule(); });
    carousel.addEventListener("touchstart", () => { hovering = true; schedule(); }, { passive: true });
    carousel.addEventListener("touchend", () => { hovering = false; schedule(); });
    carousel.addEventListener("touchcancel", () => { hovering = false; schedule(); });
    carousel.addEventListener("focusin", () => { focused = true; schedule(); });
    carousel.addEventListener("focusout", (event) => { if (!carousel.contains(event.relatedTarget)) { focused = false; schedule(); } });
    carousel.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      navigate(current + (event.key === "ArrowRight" ? 1 : -1));
    });
    document.addEventListener("visibilitychange", schedule);
    reducedMotion.addEventListener("change", (event) => { paused = event.matches; schedule(); });
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }, { threshold: 0.15 }).observe(carousel);
    schedule();
  });

  const contact = window.colegualContacto || {};
  function contactLink(selector, href, text) {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.textContent = text;
    document.querySelector(selector).replaceChildren(anchor);
  }
  const telefonos = [
    { digitos: contact.telefonoDigitos, visible: contact.telefonoVisible },
    { digitos: contact.telefono2Digitos, visible: contact.telefono2Visible },
  ].filter((item) => /^\d{8,15}$/.test(item.digitos || ""))
    .map((item) => ({ href: `tel:+${item.digitos}`, visible: item.visible || `+${item.digitos}` }));
  const cajaTelefono = document.querySelector("#contact-phone");
  if (cajaTelefono && telefonos.length) {
    cajaTelefono.replaceChildren();
    telefonos.forEach((item, indice) => {
      if (indice > 0) cajaTelefono.append(document.createTextNode(" · "));
      const enlace = document.createElement("a");
      enlace.href = item.href;
      enlace.textContent = item.visible;
      cajaTelefono.append(enlace);
    });
  }
  [["#footer-telefono", "#footer-telefono-2"], ["#footer-llamar", "#footer-llamar-2"]].forEach(([primero, segundo]) => {
    [primero, segundo].forEach((selector, indice) => {
      const nodo = document.querySelector(selector);
      const item = telefonos[indice];
      if (!nodo || !item) return;
      nodo.href = item.href;
      const texto = nodo.querySelector("[data-telefono]") || nodo;
      texto.textContent = nodo.id.startsWith("footer-llamar") ? `Llamar al ${item.visible}` : item.visible;
    });
  });
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.correo || "")) contactLink("#contact-email", `mailto:${contact.correo}`, contact.correo);
  if (contact.horario) document.querySelector("#contact-hours").textContent = contact.horario;
  if (contact.direccion) {
    document.querySelector("#contact-address").textContent = contact.direccion;
    const directions = document.querySelector("#directions-link");
    if (directions) {
      directions.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.direccion)}`;
      directions.hidden = false;
    }
  }

  const form = document.querySelector("#project-form");
  const submit = document.querySelector("#project-submit");
  submit.disabled = false;
  const messagePreview = document.querySelector("#message-preview");
  const messageText = document.querySelector("#message-text");
  const formStatus = document.querySelector("#form-status");
  const phoneError = document.querySelector("#phone-error");
  form.addEventListener("input", () => {
    messagePreview.hidden = true;
    formStatus.textContent = "";
    phoneError.hidden = true;
    for (const field of form.querySelectorAll("input, select, textarea:not([readonly])")) { field.setCustomValidity(""); field.removeAttribute("aria-invalid"); }
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    for (const name of ["nombre", "ubicacion", "descripcion", "telefono"]) {
      const field = form.elements.namedItem(name);
      field.value = field.value.trim();
      const min = name === "descripcion" ? 10 : name === "telefono" ? 8 : 2;
      field.setCustomValidity(field.value.length < min ? `Ingresa al menos ${min} caracteres.` : "");
    }
    const phone = form.elements.namedItem("telefono");
    const digits = phone.value.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15 || /[^\d+()\s-]/.test(phone.value)) {
      phone.setCustomValidity("Ingresa un teléfono de contacto de 8 a 15 dígitos.");
      phone.setAttribute("aria-invalid", "true");
      phoneError.textContent = phone.validationMessage;
      phoneError.hidden = false;
    }
    if (!form.reportValidity() || submit.getAttribute("aria-busy") === "true") return;
    const values = new FormData(form);
    const metros = String(values.get("metros") || "").trim();
    const correo = String(values.get("correo") || "").trim();
    messageText.value = ["Hola, Colegual SpA. Quisiera consultar por una obra.", "", `Tipo de trabajo: ${values.get("trabajo")}`, `Nombre: ${values.get("nombre")}`, `Teléfono: ${values.get("telefono")}`, `Correo: ${correo || "Por confirmar"}`, `Sector: ${values.get("ubicacion")}`, `Metros cuadrados: ${metros || "Por confirmar"}`, `Visita: ${values.get("visita") || "No sé"}`, "", "Descripción del proyecto:", values.get("descripcion")].join("\n");
    // Armar la consulta es instantáneo: el giro dura 300 ms para que se note que el botón respondió.
    submit.setAttribute("aria-busy", "true");
    setTimeout(() => {
      submit.removeAttribute("aria-busy");
      messagePreview.hidden = false;
      formStatus.textContent = "Consulta preparada. Puedes copiarla. Todavía no se envía al taller.";
      messageText.focus();
    }, 300);
  });
  document.querySelector("#copy-message").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(messageText.value);
      formStatus.textContent = "Consulta copiada. Puedes pegarla en tu conversación.";
    } catch {
      messageText.focus();
      messageText.select();
      formStatus.textContent = "Seleccionamos tu consulta. Usa Copiar en tu dispositivo o Ctrl+C.";
    }
  });
  document.querySelector("#copyright-year").textContent = new Date().getFullYear();
})();
