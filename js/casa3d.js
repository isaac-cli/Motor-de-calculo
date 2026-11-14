// Visor 3D interactivo de la casa/galpón para diagnosticar "¿Dónde va cada lata?".
// Motor 3D en Canvas con cámara orbital (rotación X/Y, zoom, iluminación 3D por normales y hit-testing)
// y pines HTML 1..7 sincronizados en cada frame con las coordenadas (x, y, z) del modelo.
import { escaparHtml } from "./utils.js?v=3";
import { icono } from "./iconos.js?v=3";
import { zonasObra, zonaDePerfil } from "./zonas-obra.js?v=3";

// Vista 3/4 frontal-derecha clásica: muestra el muro con ventanas, el frontón y el cobertizo lateral.
const vistaInicial = {
  yaw: 0.62,
  pitch: 0.44,
  zoom: 1,
};

const centroModelo = [4.9, 3.1, 2.2];

// Divide un cuadrilátero 3D en una grilla (nx × ny) para que el ordenamiento por profundidad sea exacto al rotar 360°.
function subdividirQuad(p0, p1, p2, p3, nx = 3, ny = 2) {
  const caras = [];
  const interp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const punto = (u, v) => interp(interp(p0, p1, u), interp(p3, p2, u), v);
  for (let i = 0; i < nx; i += 1) {
    const u0 = i / nx;
    const u1 = (i + 1) / nx;
    for (let j = 0; j < ny; j += 1) {
      const v0 = j / ny;
      const v1 = (j + 1) / ny;
      caras.push([punto(u0, v0), punto(u1, v0), punto(u1, v1), punto(u0, v1)]);
    }
  }
  return caras;
}

function normalDeCara(vertices) {
  const [a, b, c] = vertices;
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  const nx = uy * vz - uz * vy;
  const ny = uz * vx - ux * vz;
  const nz = ux * vy - uy * vx;
  const mag = Math.hypot(nx, ny, nz) || 1;
  return [nx / mag, ny / mag, nz / mag];
}

function sombrearHex(hex, factor) {
  const limpio = hex.replace("#", "");
  const r = Math.min(255, Math.max(0, Math.round(parseInt(limpio.slice(0, 2), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(limpio.slice(2, 4), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(limpio.slice(4, 6), 16) * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

function construirGeometriaCasa() {
  const caras = [];
  const trazos = [];

  const agregarCaras = (listaVertices, opciones) => {
    listaVertices.forEach((vertices) => {
      caras.push({ vertices, normal: normalDeCara(vertices), ...opciones });
    });
  };

  const agregarTrazo = (vertices, opciones) => {
    trazos.push({ vertices, ...opciones });
  };

  const largo = 9;
  const ancho = 6;
  const base = 0.3;
  const muro = 3.0;
  const cumbrera = 5.0;
  const medio = ancho / 2;
  const vuelo = 0.5;
  const vueloFronton = 0.3;
  const altoAlero = muro - (vuelo * (cumbrera - muro)) / medio;
  const xMinTecho = -vueloFronton;
  const xMaxTecho = largo + vueloFronton;

  // Cobertizo lateral derecho
  const cobDesde = 1.6;
  const cobHasta = 4.4;
  const cobX = largo + 1.6;
  const cobAltoMuro = 2.6;
  const cobAltoBorde = 2.22;

  // 1. Base / sobrecimiento de hormigón
  agregarCaras(subdividirQuad([0, ancho, 0], [largo, ancho, 0], [largo, ancho, base], [0, ancho, base], 4, 1), {
    relleno: "#3B4759",
    borde: "#475569",
  });
  agregarCaras(subdividirQuad([largo, 0, 0], [largo, ancho, 0], [largo, ancho, base], [largo, 0, base], 3, 1), {
    relleno: "#465368",
    borde: "#475569",
  });
  agregarCaras(subdividirQuad([0, 0, 0], [largo, 0, 0], [largo, 0, base], [0, 0, base], 4, 1), {
    relleno: "#334155",
    borde: "#475569",
  });
  agregarCaras(subdividirQuad([0, 0, 0], [0, ancho, 0], [0, ancho, base], [0, 0, base], 3, 1), {
    relleno: "#334155",
    borde: "#475569",
  });

  // Radier bajo cobertizo
  agregarCaras(subdividirQuad([largo, cobDesde - 0.1, 0], [cobX, cobDesde - 0.1, 0], [cobX, cobHasta + 0.1, 0], [largo, cobHasta + 0.1, 0], 2, 2), {
    relleno: "#1E293B",
    borde: "#334155",
  });

  // 2. Muros principales (4 lados + tímpanos)
  agregarCaras(subdividirQuad([0, ancho, base], [largo, ancho, base], [largo, ancho, muro], [0, ancho, muro], 5, 3), {
    relleno: "#24344D",
    borde: "#2F4260",
  });
  agregarCaras(subdividirQuad([0, 0, base], [largo, 0, base], [largo, 0, muro], [0, 0, muro], 5, 3), {
    relleno: "#1E2B40",
    borde: "#293850",
  });
  agregarCaras(subdividirQuad([largo, 0, base], [largo, ancho, base], [largo, ancho, muro], [largo, 0, muro], 4, 3), {
    relleno: "#2C3E5A",
    borde: "#364B6B",
  });
  agregarCaras(
    [
      [[largo, 0, muro], [largo, medio, muro], [largo, medio, cumbrera]],
      [[largo, medio, muro], [largo, ancho, muro], [largo, medio, cumbrera]],
    ],
    { relleno: "#2C3E5A", borde: "#3B4F6E" }
  );
  agregarCaras(subdividirQuad([0, 0, base], [0, ancho, base], [0, ancho, muro], [0, 0, muro], 4, 3), {
    relleno: "#1F2D42",
    borde: "#2C3D57",
  });
  agregarCaras(
    [
      [[0, 0, muro], [0, medio, muro], [0, medio, cumbrera]],
      [[0, medio, muro], [0, ancho, muro], [0, medio, cumbrera]],
    ],
    { relleno: "#213047", borde: "#2E405C" }
  );

  // Líneas de siding
  for (let z = base + 0.45; z < muro - 0.15; z += 0.45) {
    agregarTrazo(
      [
        [0.02, ancho + 0.01, z],
        [largo - 0.02, ancho + 0.01, z],
      ],
      { color: "#354A6B", grosor: 1 }
    );
    agregarTrazo(
      [
        [largo + 0.01, 0.02, z],
        [largo + 0.01, ancho - 0.02, z],
      ],
      { color: "#3B5275", grosor: 1 }
    );
  }

  // 3. Ventanas y puerta
  const ventanas = [
    [1.6, 3.4],
    [5.2, 7.0],
  ];
  ventanas.forEach(([x1, x2]) => {
    const xm = (x1 + x2) / 2;
    agregarCaras(
      [
        [[x1, ancho + 0.015, 1.3], [xm, ancho + 0.015, 1.3], [xm, ancho + 0.015, 2.4], [x1, ancho + 0.015, 2.4]],
        [[xm, ancho + 0.015, 1.3], [x2, ancho + 0.015, 1.3], [x2, ancho + 0.015, 2.4], [xm, ancho + 0.015, 2.4]],
      ],
      { relleno: "#0B1D30", borde: "#334155", sinSombra: true }
    );
    agregarTrazo(
      [
        [x1 + 0.25, ancho + 0.025, 2.2],
        [x1 + 0.68, ancho + 0.025, 1.62],
      ],
      { color: "rgba(56, 189, 248, 0.5)", grosor: 2 }
    );
  });

  // Ventana trasera
  agregarCaras(
    [[[3.2, -0.015, 1.35], [5.8, -0.015, 1.35], [5.8, -0.015, 2.35], [3.2, -0.015, 2.35]]],
    { relleno: "#0B1D30", borde: "#334155", sinSombra: true }
  );

  // Puerta bajo cobertizo
  agregarCaras(
    [[[largo + 0.015, 2.55, base], [largo + 0.015, 3.45, base], [largo + 0.015, 3.45, 2.22], [largo + 0.015, 2.55, 2.22]]],
    { relleno: "#152030", borde: "#475569", sinSombra: true }
  );

  // 4. Techumbre a dos aguas
  agregarCaras(
    subdividirQuad(
      [xMinTecho, medio, cumbrera],
      [xMaxTecho, medio, cumbrera],
      [xMaxTecho, ancho + vuelo, altoAlero],
      [xMinTecho, ancho + vuelo, altoAlero],
      6,
      3
    ),
    { relleno: "#354760", borde: "#475B78" }
  );
  agregarCaras(
    subdividirQuad(
      [xMinTecho, medio, cumbrera],
      [xMaxTecho, medio, cumbrera],
      [xMaxTecho, -vuelo, altoAlero],
      [xMinTecho, -vuelo, altoAlero],
      6,
      3
    ),
    { relleno: "#263449", borde: "#364760" }
  );

  for (let x = xMinTecho + 0.6; x < xMaxTecho - 0.2; x += 0.65) {
    agregarTrazo(
      [
        [x, medio, cumbrera + 0.01],
        [x, ancho + vuelo, altoAlero + 0.01],
      ],
      { color: "#4B5E7B", grosor: 1 }
    );
    agregarTrazo(
      [
        [x, medio, cumbrera + 0.01],
        [x, -vuelo, altoAlero + 0.01],
      ],
      { color: "#33445C", grosor: 1 }
    );
  }

  agregarTrazo(
    [
      [xMaxTecho, -vuelo, altoAlero],
      [xMaxTecho, medio, cumbrera],
      [xMaxTecho, ancho + vuelo, altoAlero],
    ],
    { color: "#94A3B8", grosor: 2.5 }
  );
  agregarTrazo(
    [
      [xMinTecho, -vuelo, altoAlero],
      [xMinTecho, medio, cumbrera],
      [xMinTecho, ancho + vuelo, altoAlero],
    ],
    { color: "#64748B", grosor: 2 }
  );

  // 5. Cobertizo lateral y pilares
  [cobDesde + 0.15, cobHasta - 0.15].forEach((yPoste) => {
    agregarTrazo(
      [
        [cobX - 0.08, yPoste, 0],
        [cobX - 0.08, yPoste, cobAltoBorde - 0.08],
      ],
      { color: "#64748B", grosor: 3.5 }
    );
  });
  agregarCaras(
    subdividirQuad(
      [largo, cobDesde, cobAltoMuro],
      [largo, cobHasta, cobAltoMuro],
      [cobX, cobHasta, cobAltoBorde],
      [cobX, cobDesde, cobAltoBorde],
      2,
      2
    ),
    { relleno: "#3D4F6A", borde: "#546A8A" }
  );

  // Bajada de agua lluvia
  agregarTrazo(
    [
      [4.4, ancho + vuelo + 0.12, altoAlero - 0.22],
      [4.4, ancho + 0.12, altoAlero - 0.55],
      [4.4, ancho + 0.12, base + 0.15],
      [4.4, ancho + 0.42, 0.05],
    ],
    { color: "#64748B", grosor: 3 }
  );

  // ================================================================
  // LAS 7 PIEZAS DE HOJALATERÍA EN 3D
  // ================================================================

  // 1. CUMBRERA
  agregarCaras(
    subdividirQuad(
      [xMinTecho - 0.02, medio - 0.28, cumbrera - 0.16],
      [xMaxTecho + 0.02, medio - 0.28, cumbrera - 0.16],
      [xMaxTecho + 0.02, medio, cumbrera + 0.07],
      [xMinTecho - 0.02, medio, cumbrera + 0.07],
      6,
      1
    ),
    { zona: "cumbrera" }
  );
  agregarCaras(
    subdividirQuad(
      [xMinTecho - 0.02, medio, cumbrera + 0.07],
      [xMaxTecho + 0.02, medio, cumbrera + 0.07],
      [xMaxTecho + 0.02, medio + 0.28, cumbrera - 0.16],
      [xMinTecho - 0.02, medio + 0.28, cumbrera - 0.16],
      6,
      1
    ),
    { zona: "cumbrera" }
  );
  agregarTrazo(
    [
      [xMinTecho - 0.02, medio, cumbrera + 0.08],
      [xMaxTecho + 0.02, medio, cumbrera + 0.08],
    ],
    { zona: "cumbrera", grosor: 4.5 }
  );

  // 2. CANALETA
  const yCanInt = ancho + vuelo - 0.02;
  const yCanExt = ancho + vuelo + 0.22;
  agregarCaras(
    subdividirQuad(
      [xMinTecho, yCanExt, altoAlero + 0.03],
      [xMaxTecho, yCanExt, altoAlero + 0.03],
      [xMaxTecho, yCanExt, altoAlero - 0.24],
      [xMinTecho, yCanExt, altoAlero - 0.24],
      6,
      1
    ),
    { zona: "canaleta" }
  );
  agregarCaras(
    subdividirQuad(
      [xMinTecho, yCanInt, altoAlero - 0.24],
      [xMaxTecho, yCanInt, altoAlero - 0.24],
      [xMaxTecho, yCanExt, altoAlero - 0.24],
      [xMinTecho, yCanExt, altoAlero - 0.24],
      6,
      1
    ),
    { zona: "canaleta" }
  );

  // 3. CORTAGOTERA
  agregarCaras(
    subdividirQuad(
      [cobX + 0.03, cobDesde - 0.04, cobAltoBorde + 0.04],
      [cobX + 0.03, cobHasta + 0.04, cobAltoBorde + 0.04],
      [cobX + 0.03, cobHasta + 0.04, cobAltoBorde - 0.18],
      [cobX + 0.03, cobDesde - 0.04, cobAltoBorde - 0.18],
      3,
      1
    ),
    { zona: "cortagotera" }
  );
  agregarTrazo(
    [
      [cobX + 0.08, cobDesde - 0.04, cobAltoBorde - 0.22],
      [cobX + 0.08, cobHasta + 0.04, cobAltoBorde - 0.22],
    ],
    { zona: "cortagotera", grosor: 3.5 }
  );

  // 4. ESQUINERO
  agregarCaras(
    subdividirQuad([largo - 0.22, ancho + 0.03, base], [largo + 0.03, ancho + 0.03, base], [largo + 0.03, ancho + 0.03, muro], [largo - 0.22, ancho + 0.03, muro], 1, 3),
    { zona: "esquinero" }
  );
  agregarCaras(
    subdividirQuad([largo + 0.03, ancho - 0.22, base], [largo + 0.03, ancho + 0.03, base], [largo + 0.03, ancho + 0.03, muro], [largo + 0.03, ancho - 0.22, muro], 1, 3),
    { zona: "esquinero" }
  );
  agregarTrazo(
    [
      [largo + 0.04, ancho + 0.04, base],
      [largo + 0.04, ancho + 0.04, muro],
    ],
    { zona: "esquinero", grosor: 4.5 }
  );

  // 5. INICIO DE MURO
  agregarCaras(
    subdividirQuad([0, ancho + 0.03, base], [largo, ancho + 0.03, base], [largo, ancho + 0.03, base + 0.15], [0, ancho + 0.03, base + 0.15], 5, 1),
    { zona: "inicio" }
  );
  agregarCaras(
    subdividirQuad([largo + 0.03, 0, base], [largo + 0.03, ancho, base], [largo + 0.03, ancho, base + 0.15], [largo + 0.03, 0, base + 0.15], 4, 1),
    { zona: "inicio" }
  );
  agregarTrazo(
    [
      [0, ancho + 0.04, base + 0.07],
      [largo + 0.04, ancho + 0.04, base + 0.07],
      [largo + 0.04, 0, base + 0.07],
    ],
    { zona: "inicio", grosor: 3.5 }
  );

  // 6. PERFIL "J" EN VENTANA
  ventanas.forEach(([x1, x2]) => {
    const marco = [
      [x1 - 0.04, ancho + 0.04, 1.28],
      [x2 + 0.04, ancho + 0.04, 1.28],
      [x2 + 0.04, ancho + 0.04, 2.42],
      [x1 - 0.04, ancho + 0.04, 2.42],
      [x1 - 0.04, ancho + 0.04, 1.28],
    ];
    agregarTrazo(marco, { zona: "perfil_j", grosor: 4.5 });
  });

  // 7. PERFIL "L" EN ENCUENTRO
  agregarCaras(
    subdividirQuad(
      [largo + 0.03, cobDesde, cobAltoMuro + 0.24],
      [largo + 0.03, cobHasta, cobAltoMuro + 0.24],
      [largo + 0.03, cobHasta, cobAltoMuro],
      [largo + 0.03, cobDesde, cobAltoMuro],
      2,
      1
    ),
    { zona: "perfil_l" }
  );
  agregarCaras(
    subdividirQuad(
      [largo + 0.03, cobDesde, cobAltoMuro + 0.02],
      [largo + 0.03, cobHasta, cobAltoMuro + 0.02],
      [largo + 0.26, cobHasta, cobAltoMuro - 0.04],
      [largo + 0.26, cobDesde, cobAltoMuro - 0.04],
      2,
      1
    ),
    { zona: "perfil_l" }
  );

  return { caras, trazos };
}

function margenSuperiorPines(ancho) {
  // En el celular el letrero y los botones ocupan dos filas arriba.
  return ancho < 640 ? 148 : 52;
}

function separarPines2D(cajas, ancho, alto) {
  const margenIzq = ancho < 640 ? 28 : 44;
  const margenDer = ancho < 640 ? 28 : 44;
  const margenSup = margenSuperiorPines(ancho);
  const margenInf = 28;
  for (let iter = 0; iter < 18; iter += 1) {
    let movio = false;
    for (let i = 0; i < cajas.length; i += 1) {
      for (let j = i + 1; j < cajas.length; j += 1) {
        const a = cajas[i];
        const b = cajas[j];
        const solapeX = (a.ancho + b.ancho) / 2 + 6 - Math.abs(a.x - b.x);
        const solapeY = (a.alto + b.alto) / 2 + 6 - Math.abs(a.y - b.y);
        if (solapeX <= 0 || solapeY <= 0) continue;
        movio = true;
        if (solapeY < solapeX) {
          const dir = a.y <= b.y ? -1 : 1;
          a.y += (dir * solapeY) / 2;
          b.y -= (dir * solapeY) / 2;
        } else {
          const dir = a.x <= b.x ? -1 : 1;
          a.x += (dir * solapeX) / 2;
          b.x -= (dir * solapeX) / 2;
        }
      }
    }
    cajas.forEach((c) => {
      c.x = Math.min(Math.max(c.x, margenIzq), ancho - margenDer);
      c.y = Math.min(Math.max(c.y, margenSup), alto - margenInf);
    });
    if (!movio) break;
  }
}

function distanciaPuntoSegmento(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const largoCuad = dx * dx + dy * dy;
  if (largoCuad === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / largoCuad));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function puntoEnPoligono(px, py, puntos) {
  let dentro = false;
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i, i += 1) {
    const [xi, yi] = puntos[i];
    const [xj, yj] = puntos[j];
    const intersecta = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersecta) dentro = !dentro;
  }
  return dentro;
}

function crearVisorCasa3D({ contenedor, obtenerZonaActiva, alSeleccionarZona, alPrevisualizarZona }) {
  const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const geometria = construirGeometriaCasa();

  const camara = {
    yaw: vistaInicial.yaw,
    pitch: vistaInicial.pitch,
    zoom: vistaInicial.zoom,
    objetivoYaw: vistaInicial.yaw,
    objetivoPitch: vistaInicial.pitch,
    objetivoZoom: vistaInicial.zoom,
    inerciaX: 0,
    inerciaY: 0,
    autoGiro: !movimientoReducido,
    arrastrando: false,
    punteroSobrePin: false,
  };

  contenedor.innerHTML = `
    <div class="pointer-events-none absolute inset-x-2.5 top-2.5 z-20 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <span class="inline-flex min-h-12 items-center gap-1.5 rounded-md bg-navy/90 px-3 font-mono text-base font-semibold tracking-wide text-slate-200 ring-1 ring-slate-700/90 backdrop-blur">
        <span class="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true"></span>
        MODELO 3D · ARRASTRA PARA GIRAR
      </span>
      <div class="pointer-events-auto flex items-center gap-1.5">
        <button type="button" data-control-3d="autogiro" aria-pressed="${camara.autoGiro}"
          class="inline-flex min-h-12 items-center rounded-md bg-navy/90 px-3 font-mono text-base font-semibold text-slate-200 ring-1 ring-slate-700 transition hover:text-white aria-pressed:ring-amber-500/60 aria-pressed:text-amber-300">
          ${icono("girar", "mr-2 h-5 w-5")}Auto-giro
        </button>
        <button type="button" data-control-3d="reset"
          class="inline-flex min-h-12 items-center rounded-md bg-navy/90 px-3 font-mono text-base font-semibold text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-800 hover:text-amber-300">
          ${icono("reiniciar", "mr-2 h-5 w-5")}Resetear vista 3D
        </button>
      </div>
    </div>
    <canvas class="block h-[390px] w-full cursor-grab select-none touch-none active:cursor-grabbing sm:h-[430px]" aria-label="Modelo 3D interactivo de casa y galpón con las 7 zonas de hojalatería"></canvas>
    <div class="pointer-events-none absolute inset-0 overflow-hidden" data-capa-pines>
      ${zonasObra
        .map(
          (zona) => `
            <button type="button" data-action="fijar-zona" data-zona="${zona.perfilId}" aria-pressed="false" aria-label="${zona.numero}. ${escaparHtml(zona.etiqueta)}"
              class="group/pin pointer-events-auto absolute left-0 top-0 inline-flex h-12 w-12 min-h-12 min-w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-transparent p-0 text-base font-semibold text-slate-100 transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:h-auto sm:w-auto sm:justify-start sm:bg-navy/95 sm:p-1 sm:pr-3 sm:shadow-lg sm:shadow-black/50 sm:ring-1 sm:ring-slate-500 lg:h-12 lg:w-12 lg:justify-center lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 xl:h-auto xl:w-auto xl:justify-start xl:bg-navy/95 xl:p-1 xl:pr-3 xl:shadow-lg xl:ring-1 xl:ring-slate-500">
              <span class="measure flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-base font-black text-navy shadow-md shadow-black/40 ring-1 ring-amber-200 group-aria-pressed/pin:bg-navy group-aria-pressed/pin:text-amber-300 sm:h-12 sm:w-12 lg:h-8 lg:w-8 xl:h-12 xl:w-12">${zona.numero}</span>
              <span class="hidden sm:inline lg:hidden xl:inline">${escaparHtml(zona.etiqueta)}</span>
            </button>`
        )
        .join("")}
    </div>`;

  const canvas = contenedor.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador no puede dibujar la casa en 3D.");
  const btnAutoGiro = contenedor.querySelector('[data-control-3d="autogiro"]');
  const btnReset = contenedor.querySelector('[data-control-3d="reset"]');
  const botonesPin = new Map(
    [...contenedor.querySelectorAll("button[data-zona]")].map((boton) => [boton.dataset.zona, boton])
  );

  let anchoCss = 640;
  let altoCss = 430;
  let dpr = 1;
  let zonasProyectadas = [];

  function ajustarTamano() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    anchoCss = rect.width;
    altoCss = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(anchoCss * dpr);
    canvas.height = Math.round(altoCss * dpr);
  }

  // En proyectarPunto: cuando yaw = +0.62 rad (~35°), el frente (y = 6) queda abajo-izquierda
  // y el frontón con cobertizo (x = 9..10.6) queda abajo-derecha, con z apuntando hacia arriba.
  function proyectarPunto([x, y, z]) {
    const dx = x - centroModelo[0];
    const dy = y - centroModelo[1];
    const dz = z - centroModelo[2];

    const cosY = Math.cos(camara.yaw);
    const sinY = Math.sin(camara.yaw);
    const rx = dx * cosY - dy * sinY;
    const ry = dx * sinY + dy * cosY;

    const cosP = Math.cos(camara.pitch);
    const sinP = Math.sin(camara.pitch);
    const pantallaX = rx;
    const pantallaY = ry * sinP - dz * cosP;
    const profundidad = ry * cosP + dz * sinP;

    const distanciaCamara = 24;
    const perspectiva = distanciaCamara / Math.max(distanciaCamara - profundidad * 0.45, 6);
    const escalaBase = Math.min(anchoCss, altoCss) * 0.072 * camara.zoom;
    const escala = escalaBase * perspectiva;

    return {
      x: anchoCss * 0.49 + pantallaX * escala,
      y: altoCss * 0.54 + pantallaY * escala,
      z: profundidad,
      escala,
    };
  }

  function dibujarGrillaTerreno() {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(100, 116, 139, 0.22)";
    for (let x = -1; x <= 12; x += 1) {
      const a = proyectarPunto([x, -1, 0]);
      const b = proyectarPunto([x, 7.5, 0]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let y = -1; y <= 7.5; y += 1) {
      const a = proyectarPunto([-1, y, 0]);
      const b = proyectarPunto([12, y, 0]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Sin pantalla o con la pestaña oculta no se redibuja: no gasta CPU ni batería.
  let frameId = null;
  let enPantalla = true;

  function programarFrame() {
    if (frameId === null && enPantalla && !document.hidden) frameId = requestAnimationFrame(renderFrame);
  }

  function renderFrame() {
    frameId = null;
    if (!anchoCss || !altoCss) ajustarTamano();

    if (!camara.arrastrando) {
      if (Math.abs(camara.inerciaX) > 0.0001 || Math.abs(camara.inerciaY) > 0.0001) {
        camara.objetivoYaw += camara.inerciaX;
        camara.objetivoPitch = Math.min(1.12, Math.max(0.16, camara.objetivoPitch + camara.inerciaY));
        camara.inerciaX *= 0.92;
        camara.inerciaY *= 0.92;
      } else if (camara.autoGiro && !camara.punteroSobrePin) {
        camara.objetivoYaw += 0.0014;
      }
    }

    camara.yaw += (camara.objetivoYaw - camara.yaw) * 0.16;
    camara.pitch += (camara.objetivoPitch - camara.pitch) * 0.16;
    camara.zoom += (camara.objetivoZoom - camara.zoom) * 0.16;

    const zonaActiva = obtenerZonaActiva();
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, anchoCss, altoCss);

    dibujarGrillaTerreno();

    const primitivas = [];
    const nuevasZonasHit = [];

    geometria.caras.forEach((cara) => {
      const proyectados = cara.vertices.map(proyectarPunto);
      const zMedia = proyectados.reduce((suma, p) => suma + p.z, 0) / proyectados.length;
      const sesgoZona = cara.zona ? 0.18 + (cara.zona === zonaActiva ? 0.25 : 0) : 0;
      primitivas.push({
        tipo: "cara",
        cara,
        proyectados,
        orden: zMedia + sesgoZona,
      });
    });

    geometria.trazos.forEach((trazo) => {
      const proyectados = trazo.vertices.map(proyectarPunto);
      const zMedia = proyectados.reduce((suma, p) => suma + p.z, 0) / proyectados.length;
      const sesgoZona = trazo.zona ? 0.24 + (trazo.zona === zonaActiva ? 0.3 : 0) : 0.06;
      primitivas.push({
        tipo: "trazo",
        trazo,
        proyectados,
        orden: zMedia + sesgoZona,
      });
    });

    primitivas.sort((a, b) => a.orden - b.orden);

    // Luz direccional fija respecto a la cámara para dar volumen 3D al rotar
    const luzX = Math.cos(camara.yaw - 0.55) * 0.55;
    const luzY = Math.sin(camara.yaw - 0.55) * 0.55;
    const luzZ = 0.62;

    primitivas.forEach((item) => {
      if (item.tipo === "cara") {
        const { cara, proyectados } = item;
        const puntos2D = proyectados.map((p) => [p.x, p.y]);
        ctx.beginPath();
        ctx.moveTo(proyectados[0].x, proyectados[0].y);
        for (let i = 1; i < proyectados.length; i += 1) {
          ctx.lineTo(proyectados[i].x, proyectados[i].y);
        }
        ctx.closePath();

        if (cara.zona) {
          const activa = cara.zona === zonaActiva;
          ctx.save();
          if (activa) {
            ctx.shadowColor = "rgba(245, 158, 11, 0.85)";
            ctx.shadowBlur = 14;
          }
          ctx.fillStyle = activa ? "#F59E0B" : "#94A3B8";
          ctx.strokeStyle = activa ? "#FEF08A" : "#CBD5E1";
          ctx.lineWidth = activa ? 1.8 : 1;
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          nuevasZonasHit.push({ tipo: "poligono", zona: cara.zona, puntos: puntos2D, orden: item.orden });
        } else {
          const [nx, ny, nz] = cara.normal;
          const dot = Math.abs(nx * luzX + ny * luzY + nz * luzZ);
          const factorLuz = cara.sinSombra ? 1 : 0.84 + dot * 0.32;
          ctx.fillStyle = sombrearHex(cara.relleno, factorLuz);
          ctx.fill();
          if (cara.borde) {
            ctx.strokeStyle = cara.borde;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      } else {
        const { trazo, proyectados } = item;
        const puntos2D = proyectados.map((p) => [p.x, p.y]);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(proyectados[0].x, proyectados[0].y);
        for (let i = 1; i < proyectados.length; i += 1) {
          ctx.lineTo(proyectados[i].x, proyectados[i].y);
        }
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (trazo.zona) {
          const activa = trazo.zona === zonaActiva;
          if (activa) {
            ctx.shadowColor = "rgba(245, 158, 11, 0.95)";
            ctx.shadowBlur = 14;
          }
          ctx.strokeStyle = activa ? "#FBBF24" : "#CBD5E1";
          ctx.lineWidth = activa ? (trazo.grosor ?? 4) + 2 : trazo.grosor ?? 3.5;
          ctx.stroke();
          nuevasZonasHit.push({ tipo: "polilinea", zona: trazo.zona, puntos: puntos2D, orden: item.orden });
        } else {
          ctx.strokeStyle = trazo.color;
          ctx.lineWidth = trazo.grosor ?? 1.5;
          ctx.stroke();
        }
        ctx.restore();
      }
    });

    zonasProyectadas = nuevasZonasHit.sort((a, b) => b.orden - a.orden);

    // Proyectar coordenadas 3D de los 7 pines y separar si se acercan en algún ángulo de giro
    const muestraTexto = (anchoCss >= 640 && anchoCss < 1024) || anchoCss >= 1280;
    const margenSup = margenSuperiorPines(anchoCss);
    const cajasPin = zonasObra.map((zona) => {
      const pAncla = proyectarPunto(zona.ancla);
      const pPin = proyectarPunto(zona.anclaPin);
      return {
        zona,
        pAncla,
        x: Math.min(Math.max(pPin.x, 28), anchoCss - 28),
        y: Math.min(Math.max(pPin.y, margenSup), altoCss - 28),
        ancho: muestraTexto ? 150 : 48,
        alto: 48,
      };
    });
    separarPines2D(cajasPin, anchoCss, altoCss);

    cajasPin.forEach(({ zona, pAncla, x: pinX, y: pinY }) => {
      const activa = zona.perfilId === zonaActiva;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3, 4]);
      ctx.moveTo(pAncla.x, pAncla.y);
      ctx.lineTo(pinX, pinY);
      ctx.strokeStyle = activa ? "#FBBF24" : "rgba(148, 163, 184, 0.68)";
      ctx.lineWidth = activa ? 2 : 1.3;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(pAncla.x, pAncla.y, activa ? 5.5 : 3.8, 0, Math.PI * 2);
      ctx.fillStyle = activa ? "#FBBF24" : "#E2E8F0";
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const boton = botonesPin.get(zona.perfilId);
      if (boton) {
        boton.style.left = `${pinX.toFixed(1)}px`;
        boton.style.top = `${pinY.toFixed(1)}px`;
        boton.style.zIndex = activa ? "30" : String(Math.round(10 + pAncla.z));
        if (boton.getAttribute("aria-pressed") !== String(activa)) {
          boton.setAttribute("aria-pressed", String(activa));
        }
      }
    });

    ctx.restore();
    programarFrame();
  }

  function detectarZonaEnPunto(x, y) {
    for (const item of zonasProyectadas) {
      if (item.tipo === "poligono" && puntoEnPoligono(x, y, item.puntos)) {
        return item.zona;
      }
      if (item.tipo === "polilinea") {
        for (let i = 0; i < item.puntos.length - 1; i += 1) {
          const [x1, y1] = item.puntos[i];
          const [x2, y2] = item.puntos[i + 1];
          if (distanciaPuntoSegmento(x, y, x1, y1, x2, y2) <= 11) {
            return item.zona;
          }
        }
      }
    }
    return null;
  }

  let inicioArrastre = null;
  let distanciaArrastre = 0;

  canvas.addEventListener("pointerdown", (evento) => {
    try {
      canvas.setPointerCapture(evento.pointerId);
    } catch {
      // Eventos sintéticos pueden no tener pointerId activo
    }
    camara.arrastrando = true;
    camara.inerciaX = 0;
    camara.inerciaY = 0;
    inicioArrastre = { x: evento.clientX, y: evento.clientY };
    distanciaArrastre = 0;
  });

  canvas.addEventListener("pointermove", (evento) => {
    const rect = canvas.getBoundingClientRect();
    const xLocal = evento.clientX - rect.left;
    const yLocal = evento.clientY - rect.top;

    if (camara.arrastrando && inicioArrastre) {
      const dx = evento.clientX - inicioArrastre.x;
      const dy = evento.clientY - inicioArrastre.y;
      inicioArrastre = { x: evento.clientX, y: evento.clientY };
      distanciaArrastre += Math.hypot(dx, dy);

      const deltaYaw = -dx * 0.0085;
      const deltaPitch = dy * 0.0065;
      camara.objetivoYaw += deltaYaw;
      camara.objetivoPitch = Math.min(1.12, Math.max(0.16, camara.objetivoPitch + deltaPitch));
      camara.inerciaX = deltaYaw * 0.45;
      camara.inerciaY = deltaPitch * 0.45;
      return;
    }

    const zonaSobre = detectarZonaEnPunto(xLocal, yLocal);
    canvas.style.cursor = zonaSobre ? "pointer" : "grab";
    if (zonaSobre) {
      alPrevisualizarZona?.(zonaSobre);
    }
  });

  function finalizarArrastre(evento) {
    if (!camara.arrastrando) return;
    camara.arrastrando = false;
    if (distanciaArrastre < 6) {
      const rect = canvas.getBoundingClientRect();
      const zonaClick = detectarZonaEnPunto(evento.clientX - rect.left, evento.clientY - rect.top);
      if (zonaClick) alSeleccionarZona?.(zonaClick);
    }
    inicioArrastre = null;
  }

  canvas.addEventListener("pointerup", finalizarArrastre);
  canvas.addEventListener("pointercancel", () => {
    camara.arrastrando = false;
    inicioArrastre = null;
  });

  canvas.addEventListener(
    "wheel",
    (evento) => {
      evento.preventDefault();
      const factor = evento.deltaY > 0 ? -0.08 : 0.08;
      camara.objetivoZoom = Math.min(1.45, Math.max(0.78, camara.objetivoZoom + factor));
    },
    { passive: false }
  );

  botonesPin.forEach((boton) => {
    boton.addEventListener("pointerenter", () => {
      camara.punteroSobrePin = true;
    });
    boton.addEventListener("pointerleave", () => {
      camara.punteroSobrePin = false;
    });
  });

  function actualizarBotonAutoGiro() {
    btnAutoGiro?.setAttribute("aria-pressed", String(camara.autoGiro));
  }

  btnAutoGiro?.addEventListener("click", (evento) => {
    evento.stopPropagation();
    camara.autoGiro = !camara.autoGiro;
    actualizarBotonAutoGiro();
  });

  function resetearVista() {
    const vueltas = Math.round((camara.yaw - vistaInicial.yaw) / (Math.PI * 2));
    camara.yaw -= vueltas * Math.PI * 2;
    camara.objetivoYaw = vistaInicial.yaw;
    camara.objetivoPitch = vistaInicial.pitch;
    camara.objetivoZoom = vistaInicial.zoom;
    camara.inerciaX = 0;
    camara.inerciaY = 0;
  }

  btnReset?.addEventListener("click", (evento) => {
    evento.stopPropagation();
    resetearVista();
  });

  function enfocarZona(perfilId) {
    const zona = zonaDePerfil(perfilId);
    if (!zona?.vistaIdeal) return;
    const vueltas = Math.round((camara.yaw - zona.vistaIdeal.yaw) / (Math.PI * 2));
    camara.yaw -= vueltas * Math.PI * 2;
    camara.objetivoYaw = zona.vistaIdeal.yaw;
    camara.objetivoPitch = zona.vistaIdeal.pitch;
    camara.inerciaX = 0;
    camara.inerciaY = 0;
  }

  const observador = new ResizeObserver(() => ajustarTamano());
  observador.observe(canvas);
  new IntersectionObserver(([entrada]) => {
    enPantalla = entrada.isIntersecting;
    programarFrame();
  }).observe(canvas);
  document.addEventListener("visibilitychange", programarFrame);
  ajustarTamano();
  programarFrame();

  return {
    resetearVista,
    enfocarZona,
    actualizarPines() {
      const activa = obtenerZonaActiva();
      botonesPin.forEach((boton, id) => {
        boton.setAttribute("aria-pressed", String(id === activa));
      });
    },
  };
}

export { zonaDePerfil, crearVisorCasa3D };
