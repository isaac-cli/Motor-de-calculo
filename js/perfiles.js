// Catálogo de perfiles de hojalatería y generador de esquemas SVG.
// Cada lado se dibuja como un tramo con un ángulo absoluto (0° = derecha, 90° = arriba),
// así el esquema se redibuja proporcional a los cm y grados que ingresa el usuario.
import { escaparHtml } from "./utils.js?v=3";

const perfiles = [
  {
    id: "inicio",
    nombre: "Inicio",
    descripcionCorta: "Arranque de revestimientos y muros.",
    tip: "Pieza base de arranque para revestimientos (siding/forros) y borde inferior de muros. Fija el nivel inicial y evita la entrada de agua o insectos.",
    lados: [
      { letra: "A", nombre: "Bajada larga", cm: 10, angulo: -90 },
      { letra: "B", nombre: "Quiebre horizontal", cm: 5, angulo: 0 },
      { letra: "C", nombre: "Bajada corta", cm: 4, angulo: -90 },
      { letra: "D", nombre: "Gancho de retorno", cm: 1, angulo: 180 },
    ],
  },
  {
    id: "perfil_j",
    nombre: 'Perfil "J"',
    descripcionCorta: "Remate de bordes de revestimiento.",
    tip: "Recibe y remata los bordes de las planchas de revestimiento en ventanas, puertas y encuentros de alero, ocultando los cortes.",
    lados: [
      { letra: "A", nombre: "Respaldo", cm: 12, angulo: -90 },
      { letra: "B", nombre: "Base", cm: 4, angulo: 0 },
      { letra: "C", nombre: "Frente", cm: 5, angulo: 90 },
      { letra: "D", nombre: "Pestaña de retorno", cm: 1, angulo: 180 },
    ],
  },
  {
    id: "perfil_l",
    nombre: 'Perfil "L"',
    descripcionCorta: "Remate con botagua multipropósito.",
    tip: "Remate multipropósito para encuentros de muro con techo, zócalos y bordes laterales donde se necesita desviar el agua.",
    lados: [
      { letra: "A", nombre: "Espalda", cm: 15, angulo: -90 },
      { letra: "B", nombre: "Base", cm: 10, angulo: 0 },
      { letra: "C", nombre: "Botagua", cm: 2, angulo: -45 },
    ],
  },
  {
    id: "esquinero",
    nombre: "Esquinero",
    descripcionCorta: "Sello de esquinas verticales.",
    tip: "Protege y sella las esquinas verticales, exteriores o interiores, de galpones y viviendas contra filtraciones de viento y lluvia.",
    lados: [
      { letra: "A", nombre: "Retorno izquierdo", cm: 2, angulo: 180 },
      { letra: "B", nombre: "Ala izquierda", cm: 10, angulo: 45 },
      { letra: "C", nombre: "Ala derecha", cm: 10, angulo: -45 },
      { letra: "D", nombre: "Retorno derecho", cm: 2, angulo: 180 },
    ],
  },
  {
    id: "cumbrera",
    nombre: "Cumbrera",
    descripcionCorta: "Cierre de la cresta a dos aguas.",
    tip: "Sella la unión superior de las dos aguas del techo e impide que la lluvia y el viento entren por la cresta de la techumbre.",
    lados: [
      { letra: "A", nombre: "Faldón izquierdo", cm: 3, angulo: 70 },
      { letra: "B", nombre: "Ala izquierda", cm: 15, angulo: 20 },
      { letra: "C", nombre: "Ala derecha", cm: 15, angulo: -20 },
      { letra: "D", nombre: "Faldón derecho", cm: 3, angulo: -70 },
    ],
  },
  {
    id: "canaleta",
    nombre: "Canaleta",
    descripcionCorta: "Recolecta el agua lluvia del alero.",
    tip: "Recoge toda el agua lluvia que escurre de la cubierta y la conduce hacia las bajadas, protegiendo muros y fundaciones.",
    lados: [
      { letra: "A", nombre: "Ala bajo cubierta", cm: 6, angulo: -35 },
      { letra: "B", nombre: "Pared trasera", cm: 12, angulo: -90 },
      { letra: "C", nombre: "Fondo", cm: 12, angulo: 0 },
      { letra: "D", nombre: "Frente", cm: 10, angulo: 90 },
      { letra: "E", nombre: "Rulo superior", cm: 2, angulo: 180 },
      { letra: "F", nombre: "Pestaña del rulo", cm: 1, angulo: -90 },
    ],
  },
  {
    id: "cortagotera",
    nombre: "Cortagotera / Forro Alero",
    sinonimos: ["forro", "forro alero", "gotero"],
    descripcionCorta: "Borde de alero que corta la gota.",
    tip: "Va en el borde del alero o coronación y obliga a la gota a caer lejos de la tapa y el muro, evitando que el agua se devuelva por capilaridad.",
    lados: [
      { letra: "A", nombre: "Pestaña interna", cm: 2, angulo: -90 },
      { letra: "B", nombre: "Base inferior", cm: 6, angulo: 180 },
      { letra: "C", nombre: "Pared vertical", cm: 10, angulo: 90 },
      { letra: "D", nombre: "Mesa superior", cm: 12, angulo: 0 },
      { letra: "E", nombre: "Caída gotero", cm: 4, angulo: -50 },
    ],
  },
];

const temas = {
  claro: {
    trazo: "#1E293B",
    brillo: "#94A3B8",
    activo: "#D97706",
    brilloActivo: "#FCD34D",
    pliegue: "#FFFFFF",
    etiquetaFondo: "#FFFFFF",
    etiquetaBorde: "#CBD5E1",
    etiquetaTexto: "#0F172A",
    grilla: "rgba(15, 23, 42, 0.07)",
  },
  oscuro: {
    trazo: "#E2E8F0",
    brillo: "#64748B",
    activo: "#F59E0B",
    brilloActivo: "#FDE68A",
    pliegue: "#0F172A",
    etiquetaFondo: "#0F172A",
    etiquetaBorde: "#475569",
    etiquetaTexto: "#F8FAFC",
    grilla: "rgba(148, 163, 184, 0.10)",
  },
};

let contadorSvg = 0;

function obtenerPerfil(perfilId) {
  return perfiles.find((perfil) => perfil.id === perfilId) ?? perfiles[0];
}

function ladosPorDefecto(perfilId) {
  return obtenerPerfil(perfilId).lados.map((lado) => lado.cm);
}

function angulosPorDefecto(perfilId) {
  return obtenerPerfil(perfilId).lados.map((lado) => lado.angulo);
}

// Los centímetros de ejemplo quedan en el dibujo y en el placeholder, no como valor escrito.
function ladosVacios(perfilId) {
  return obtenerPerfil(perfilId).lados.map(() => null);
}

// Pieza pedida desde la portada (?pieza=canaleta). Devuelve null si no existe.
function perfilDesdeBusqueda(busqueda) {
  const params = new URLSearchParams(busqueda);
  const id = params.get("pieza") || params.get("perfil");
  return perfiles.some((perfil) => perfil.id === id) ? id : null;
}

const LETRAS_GRIEGAS = ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ"];

function formatearCmSvg(valor) {
  return Number(valor).toLocaleString("es-CL", { maximumFractionDigits: 1 });
}

function formatearAnguloSvg(valor) {
  const redondeado = Math.round(Number(valor) * 10) / 10;
  return redondeado.toLocaleString("es-CL", { maximumFractionDigits: 1 });
}

function resolverAngulo(lado, valoresAngulo, indice) {
  if (Array.isArray(valoresAngulo)) {
    const crudo = valoresAngulo[indice];
    if (crudo !== null && crudo !== undefined && crudo !== "" && Number.isFinite(Number(crudo))) {
      return Number(crudo);
    }
  }
  return lado.angulo;
}

function calcularPuntos(perfil, valoresCm, valoresAngulo = null) {
  const largos = perfil.lados.map((lado, indice) => {
    const valor = Number(valoresCm?.[indice]);
    return Number.isFinite(valor) && valor > 0 ? valor : lado.cm;
  });
  const total = largos.reduce((suma, largo) => suma + largo, 0);
  // Los tramos muy cortos (pestañas de 1 cm) se agrandan solo en el dibujo para que se vean.
  const largoMinimoVisual = total * 0.07;

  let x = 0;
  let y = 0;
  const puntos = [{ x, y }];
  perfil.lados.forEach((lado, indice) => {
    const largo = Math.max(largos[indice], largoMinimoVisual);
    const angulo = resolverAngulo(lado, valoresAngulo, indice);
    const radianes = (angulo * Math.PI) / 180;
    x += Math.cos(radianes) * largo;
    y += Math.sin(radianes) * largo;
    puntos.push({ x, y });
  });
  return puntos;
}

function calcularTransformacionLienzo(puntos, ancho, alto, margen) {
  const xs = puntos.map((punto) => punto.x);
  const ys = puntos.map((punto) => punto.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const anchoPerfil = Math.max(maxX - minX, 0.001);
  const altoPerfil = Math.max(maxY - minY, 0.001);
  const escala = Math.min((ancho - margen * 2) / anchoPerfil, (alto - margen * 2) / altoPerfil);
  const desfaseX = (ancho - anchoPerfil * escala) / 2;
  const desfaseY = (alto - altoPerfil * escala) / 2;
  return { minX, maxY, escala, desfaseX, desfaseY };
}

function ajustarAlLienzo(puntos, ancho, alto, margen, transformacionFija = null) {
  const t = transformacionFija || calcularTransformacionLienzo(puntos, ancho, alto, margen);
  return puntos.map((punto) => ({
    x: t.desfaseX + (punto.x - t.minX) * t.escala,
    y: t.desfaseY + (t.maxY - punto.y) * t.escala,
  }));
}

function dibujarArcosAngulos(puntos, mostrarAngulo) {
  if (!mostrarAngulo || puntos.length < 3) return "";
  const arcos = [];
  for (let k = 1; k < puntos.length - 1; k += 1) {
    const previo = puntos[k - 1];
    const vertice = puntos[k];
    const siguiente = puntos[k + 1];

    const uX = previo.x - vertice.x;
    const uY = previo.y - vertice.y;
    const vX = siguiente.x - vertice.x;
    const vY = siguiente.y - vertice.y;
    const largoU = Math.hypot(uX, uY);
    const largoV = Math.hypot(vX, vY);
    if (largoU < 1 || largoV < 1) continue;

    const phi1 = Math.atan2(uY, uX);
    const phi2 = Math.atan2(vY, vX);
    let delta = Math.atan2(Math.sin(phi2 - phi1), Math.cos(phi2 - phi1));
    const grados = (Math.abs(delta) * 180) / Math.PI;
    const radio = Math.max(13, Math.min(26, largoU * 0.42, largoV * 0.42));

    const inicioArcoX = vertice.x + Math.cos(phi1) * radio;
    const inicioArcoY = vertice.y + Math.sin(phi1) * radio;
    const finArcoX = vertice.x + Math.cos(phi2) * radio;
    const finArcoY = vertice.y + Math.sin(phi2) * radio;
    const sweepFlag = delta >= 0 ? 1 : 0;

    // Si los dos lados están casi superpuestos (0°) o colineales (180°), evitamos path degenerado
    const sectorPath =
      grados > 1 && grados < 179.5
        ? `<path d="M ${vertice.x} ${vertice.y} L ${inicioArcoX} ${inicioArcoY} A ${radio} ${radio} 0 0 ${sweepFlag} ${finArcoX} ${finArcoY} Z"
             fill="rgba(219, 39, 119, 0.22)" stroke="none" pointer-events="none" />
           <path d="M ${inicioArcoX} ${inicioArcoY} A ${radio} ${radio} 0 0 ${sweepFlag} ${finArcoX} ${finArcoY}"
             fill="none" stroke="#db2777" stroke-width="2" pointer-events="none" />`
        : "";

    const bisectriz = Math.abs(delta) < 0.02 ? phi1 + Math.PI / 2 : phi1 + delta / 2;
    const distTexto = radio + 15;
    const textoX = vertice.x + Math.cos(bisectriz) * distTexto;
    const textoY = vertice.y + Math.sin(bisectriz) * distTexto;
    const letraGriega = LETRAS_GRIEGAS[(k - 1) % LETRAS_GRIEGAS.length];

    arcos.push(`
      <g class="angulo-arco" pointer-events="none">
        ${sectorPath}
        <text x="${textoX}" y="${textoY + 4}" text-anchor="middle"
          font-family="JetBrains Mono, monospace" font-size="12.5" font-weight="800"
          fill="#be185d" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round"
          style="paint-order: stroke fill;">${letraGriega} = ${formatearAnguloSvg(grados)}°</text>
      </g>`);
  }
  return arcos.join("");
}

/** Separa las etiquetas que se montan (pestañas cortas juntas) y las mantiene dentro del lienzo. */
function separarEtiquetas(cajas, ancho, alto) {
  const holgura = 4;
  for (let vuelta = 0; vuelta < 40; vuelta += 1) {
    let movio = false;
    for (let i = 0; i < cajas.length; i += 1) {
      for (let j = i + 1; j < cajas.length; j += 1) {
        const a = cajas[i];
        const b = cajas[j];
        const solapeX = (a.ancho + b.ancho) / 2 + holgura - Math.abs(a.x - b.x);
        const solapeY = (a.alto + b.alto) / 2 + holgura - Math.abs(a.y - b.y);
        if (solapeX <= 0 || solapeY <= 0) continue;
        movio = true;
        if (solapeY < solapeX) {
          const signo = a.y <= b.y ? -1 : 1;
          a.y += (signo * solapeY) / 2;
          b.y -= (signo * solapeY) / 2;
        } else {
          const signo = a.x <= b.x ? -1 : 1;
          a.x += (signo * solapeX) / 2;
          b.x -= (signo * solapeX) / 2;
        }
      }
    }
    cajas.forEach((caja) => {
      caja.x = Math.min(Math.max(caja.x, caja.ancho / 2 + 2), ancho - caja.ancho / 2 - 2);
      caja.y = Math.min(Math.max(caja.y, caja.alto / 2 + 2), alto - caja.alto / 2 - 2);
    });
    if (!movio) break;
  }
}

/**
 * Devuelve el SVG (string) de un perfil con sus lados y ángulos proporcionales.
 * valoresCm: arreglo con los cm de cada lado (null = sin dato, se dibuja con el valor de referencia).
 */
function dibujarPerfil(perfil, valoresCm, opciones = {}) {
  const {
    angulos = null,
    ladoActivo = null,
    ancho = 440,
    alto = 280,
    tema = "claro",
    mini = false,
    etiquetas = !mini,
    compacto = false,
    grilla = !mini,
    letras = true,
    mostrarAngulo = !mini && !compacto,
    interactivo = false,
    transformacionFija = null,
    clase = "h-full w-full",
    trazar = false,
  } = opciones;

  const colores = temas[tema] ?? temas.claro;
  const margen = mini ? 6 : compacto ? 30 : 58;
  const puntosCrudos = calcularPuntos(perfil, valoresCm, angulos);
  const puntos = ajustarAlLienzo(puntosCrudos, ancho, alto, margen, transformacionFija);
  const centroX = puntos.reduce((suma, punto) => suma + punto.x, 0) / puntos.length;
  const centroY = puntos.reduce((suma, punto) => suma + punto.y, 0) / puntos.length;
  const idGrilla = `grilla-perfil-${(contadorSvg += 1)}`;
  const grosor = mini ? 3 : 7;

  const arcos = dibujarArcosAngulos(puntos, mostrarAngulo);

  const tramos = perfil.lados.map((lado, indice) => {
    const inicio = puntos[indice];
    const fin = puntos[indice + 1];
    const esActivo = indice === ladoActivo;
    const hitLine = interactivo
      ? `<line x1="${inicio.x}" y1="${inicio.y}" x2="${fin.x}" y2="${fin.y}"
          stroke="transparent" stroke-width="22" stroke-linecap="round"
          style="cursor: grab;" data-drag-lado="${indice}"
          data-pivote-x="${inicio.x}" data-pivote-y="${inicio.y}" />`
      : "";
    return `
      <line x1="${inicio.x}" y1="${inicio.y}" x2="${fin.x}" y2="${fin.y}"
        stroke="${esActivo ? colores.activo : colores.trazo}" stroke-width="${esActivo ? grosor + 2 : grosor}" stroke-linecap="round"${trazar ? ' pathLength="1" class="perfil-linea"' : ""} pointer-events="none" />
      ${mini ? "" : `<line x1="${inicio.x}" y1="${inicio.y}" x2="${fin.x}" y2="${fin.y}"
        stroke="${esActivo ? colores.brilloActivo : colores.brillo}" stroke-width="1.5" stroke-linecap="round" opacity="0.9" pointer-events="none" />`}
      ${hitLine}`;
  });

  const pliegues = mini
    ? ""
    : interactivo
      ? puntos
          .map((punto, k) => {
            const esExtremo = k === 0 || k === puntos.length - 1;
            const ladoAsociado = k === 0 ? 0 : k - 1;
            const pivote = k === 0 ? puntos[1] : puntos[k - 1];
            const esActivo = ladoAsociado === ladoActivo;
            return `
              <g style="cursor: grab;" data-drag-vertice="${k}" data-drag-lado="${ladoAsociado}"
                data-pivote-x="${pivote.x}" data-pivote-y="${pivote.y}"
                data-invertir="${k === 0 ? "1" : "0"}">
                <circle cx="${punto.x}" cy="${punto.y}" r="14" fill="transparent" />
                <circle cx="${punto.x}" cy="${punto.y}" r="${esExtremo ? 5 : 6}"
                  fill="${esActivo ? colores.activo : "#1d4ed8"}"
                  stroke="#ffffff" stroke-width="2" />
              </g>`;
          })
          .join("")
      : puntos
          .slice(1, -1)
          .map(
            (punto) =>
              `<circle cx="${punto.x}" cy="${punto.y}" r="4.5" fill="${colores.pliegue}" stroke="${colores.trazo}" stroke-width="2" />`
          )
          .join("");

  const cajas = etiquetas
    ? perfil.lados.map((lado, indice) => {
        const inicio = puntos[indice];
        const fin = puntos[indice + 1];
        const dx = fin.x - inicio.x;
        const dy = fin.y - inicio.y;
        const largo = Math.hypot(dx, dy) || 1;
        const medioX = (inicio.x + fin.x) / 2;
        const medioY = (inicio.y + fin.y) / 2;
        let normalX = -dy / largo;
        let normalY = dx / largo;
        const haciaAfuera =
          Math.hypot(medioX + normalX - centroX, medioY + normalY - centroY) >=
          Math.hypot(medioX - normalX - centroX, medioY - normalY - centroY);
        if (!haciaAfuera) {
          normalX = -normalX;
          normalY = -normalY;
        }
        const valor = valoresCm?.[indice];
        const textoCm =
          valor === null || valor === undefined || valor === ""
            ? "? cm"
            : `${formatearCmSvg(valor)} cm`;
        const texto = compacto ? "" : textoCm;
        const distancia = compacto ? 18 : 32;
        const muestraLetra = letras || compacto;
        return {
          letra: lado.letra,
          muestraLetra,
          texto,
          esActivo: indice === ladoActivo,
          ancho: compacto ? 28 : (muestraLetra ? 40 : 18) + texto.length * 8.2,
          alto: compacto ? 28 : 32,
          medioX,
          medioY,
          x: medioX + normalX * distancia,
          y: medioY + normalY * distancia,
        };
      })
    : [];
  separarEtiquetas(cajas, ancho, alto);

  const rotulos = cajas
    .map((caja) => {
      const desplazada = Math.hypot(caja.x - caja.medioX, caja.y - caja.medioY) > (compacto ? 26 : 40);
      const guia = desplazada
        ? `<line x1="${caja.medioX}" y1="${caja.medioY}" x2="${caja.x}" y2="${caja.y}" stroke="${colores.etiquetaBorde}" stroke-width="1" stroke-dasharray="3 3" pointer-events="none" />`
        : "";
      const fondo = caja.esActivo ? colores.activo : colores.etiquetaFondo;
      const borde = caja.esActivo ? colores.activo : colores.etiquetaBorde;
      const contenido = compacto
        ? `<text x="0" y="5.5" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="16" font-weight="800"
            fill="${caja.esActivo ? "#FFFFFF" : colores.activo}">${caja.letra}</text>`
        : caja.muestraLetra
          ? `<text x="${-caja.ancho / 2 + 12}" y="5" font-family="JetBrains Mono, monospace" font-size="14" font-weight="800"
            fill="${caja.esActivo ? "#FFFFFF" : colores.activo}">${caja.letra}</text>
          <text x="${-caja.ancho / 2 + 28}" y="5" font-family="JetBrains Mono, monospace" font-size="13" font-weight="600"
            fill="${caja.esActivo ? "#FFFFFF" : colores.etiquetaTexto}">${caja.texto}</text>`
          : `<text x="0" y="5" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="13" font-weight="600"
            fill="${caja.esActivo ? "#FFFFFF" : colores.etiquetaTexto}">${caja.texto}</text>`;
      return `
        ${guia}
        <g transform="translate(${caja.x} ${caja.y})" pointer-events="none">
          <rect x="${-caja.ancho / 2}" y="${-caja.alto / 2}" width="${caja.ancho}" height="${caja.alto}" rx="${caja.alto / 2}"
            fill="${fondo}" stroke="${borde}" stroke-width="1.5" />
          ${contenido}
        </g>`;
    })
    .join("");

  const descripcion = `${perfil.nombre}: ${perfil.lados
    .map((lado, indice) => `${letras ? lado.letra : lado.nombre} ${valoresCm?.[indice] ?? "?"} cm`)
    .join(", ")}`;

  const estiloSvg = interactivo ? ' style="touch-action: none; user-select: none;"' : "";

  return `
    <svg viewBox="0 0 ${ancho} ${alto}" class="${clase}"${estiloSvg} role="img" aria-label="Esquema ${escaparHtml(descripcion)}" xmlns="http://www.w3.org/2000/svg">
      ${
        grilla
          ? `<defs>
              <pattern id="${idGrilla}" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="${colores.grilla}" stroke-width="1" />
              </pattern>
            </defs>
            <rect width="${ancho}" height="${alto}" fill="url(#${idGrilla})" />`
          : ""
      }
      ${arcos}
      ${tramos.join("")}
      ${pliegues}
      ${rotulos}
    </svg>`;
}

export {
  perfiles,
  obtenerPerfil,
  ladosPorDefecto,
  angulosPorDefecto,
  ladosVacios,
  perfilDesdeBusqueda,
  calcularPuntos,
  calcularTransformacionLienzo,
  dibujarPerfil,
};
