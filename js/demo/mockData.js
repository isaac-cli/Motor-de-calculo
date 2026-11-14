// Datos de prueba del mockup (aún no hay endpoints de pedidos, lotes ni usuarios).
import { obtenerPerfil } from "../perfiles.js?v=3";
import { crearItemCotizacion } from "../cotizador.js?v=3";

const usuarioDemo = {
  nombre: "Juan Pérez",
  razonSocial: "Juan Pérez Soto · Constructora y Techumbres JP",
  rut: "Por confirmar",
  tipo: "Constructora / Maestro",
  email: "jperez@correo.cl",
  telefono: "+56 9 7745 2190",
};

const etapas = [
  {
    id: "recoleccion",
    titulo: "En Recolección (Lote)",
    icono: "bandeja",
    paso: "Recibido / En Lote",
    detalle: "Tu pedido está confirmado y entra al lote de compra de material.",
  },
  {
    id: "material",
    titulo: "Material en Taller",
    icono: "camion",
    paso: "Lata en Taller",
    detalle: "Las planchas ya llegaron al taller y tu pedido está en la fila de corte.",
  },
  {
    id: "corte",
    titulo: "En Corte y Plegado",
    icono: "tijera",
    paso: "En Corte y Plegado",
    detalle: "Estamos cortando y plegando tus perfiles con las medidas que enviaste.",
  },
  {
    id: "listo",
    titulo: "Listo para Retiro",
    icono: "checkCirculo",
    paso: "Listo para Retiro",
    detalle: "Tus perfiles están listos. Te esperamos en el taller para el retiro.",
  },
];

function sumarDias(fecha, dias) {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function formatoFechaCorta(fecha) {
  const texto = fecha.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" });
  return texto.charAt(0).toUpperCase() + texto.slice(1).replace(/[.,]/g, "");
}

function calcularLoteActual(hoy = new Date()) {
  const diaSemana = hoy.getDay();
  const diaActual = diaSemana === 0 ? 3 : diaSemana <= 3 ? diaSemana : diaSemana - 3;
  return { diaActual };
}

function emision(diasAtras, hora) {
  const fecha = sumarDias(new Date(), -diasAtras);
  const [horas, minutos] = hora.split(":").map(Number);
  fecha.setHours(horas, minutos, 0, 0);
  return { emitida: fecha.toISOString(), fecha: `${formatoFechaCorta(fecha)} · ${hora}` };
}

function emisionActual() {
  const ahora = new Date();
  const hora = ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return { emitida: ahora.toISOString(), fecha: `${formatoFechaCorta(ahora)} · ${hora}` };
}

function numeroBoleta(folio) {
  return `B-${String(folio).replace(/\D/g, "").padStart(6, "0")}`;
}

function haceCuanto(iso) {
  const inicioDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const dias = Math.round((inicioDia(new Date()) - inicioDia(new Date(iso))) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

function item(perfilId, ladosCm, espesor, materialId, metros, molde = false) {
  return crearItemCotizacion({ perfil: obtenerPerfil(perfilId), ladosCm, espesor, materialId, metros, molde });
}

const lados = {
  inicio: [10, 5, 4, 1],
  perfilJ: [12, 4, 5, 1],
  perfilL: [15, 10, 2],
  esquinero: [2, 10, 10, 2],
  cumbrera: [3, 15, 15, 3],
  canaleta: [6, 12, 12, 10, 2, 1],
  cortagotera: [2, 6, 10, 12, 4],
};

function crearPedidosDemo() {
  const { diaActual } = calcularLoteActual();
  const diaLote = (dias) => Math.min(dias, diaActual - 1);

  // Las 3 boletas de Juan Pérez están armadas para que sus totales calcen con la fórmula:
  // CG-1042 = $184.320 · CG-1038 = $125.280 · CG-1029 = $96.400 (incluye 2 moldes de cartón).
  const pedidos = [
    {
      folio: "CG-1029",
      cliente: usuarioDemo.nombre,
      telefono: usuarioDemo.telefono,
      etapa: "listo",
      ...emision(5, "11:30"),
      items: [
        item("esquinero", lados.esquinero, "0.4", "prepintada-verde", 18, true),
        item("perfil_l", lados.perfilL, "0.4", "prepintada-verde", 4, true),
      ],
    },
    {
      folio: "CG-1031",
      cliente: "Constructora Los Andes Ltda.",
      telefono: "+56 9 6123 4587",
      etapa: "listo",
      ...emision(5, "16:05"),
      items: [
        item("canaleta", lados.canaleta, "0.5", "prepintada-grafito", 42),
        item("cortagotera", lados.cortagotera, "0.4", "zincalum", 42),
      ],
    },
    {
      folio: "CG-1033",
      cliente: "Jorge Tapia Morales",
      telefono: "+56 9 8890 1123",
      etapa: "listo",
      ...emision(4, "10:20"),
      items: [item("cumbrera", lados.cumbrera, "0.4", "prepintada-rojo", 12)],
    },
    {
      folio: "CG-1035",
      cliente: "Pedro Muñoz Araya",
      telefono: "+56 9 5321 7764",
      etapa: "corte",
      ...emision(3, "09:50"),
      items: [item("esquinero", [2, 12, 12, 2], "0.5", "zincalum", 8, true)],
    },
    {
      folio: "CG-1036",
      cliente: "Inmobiliaria Altos del Valle",
      telefono: "+56 9 9012 3345",
      etapa: "material",
      ...emision(3, "17:30"),
      items: [
        item("canaleta", [6, 14, 14, 12, 2, 1], "0.5", "prepintada-blanco", 60),
        item("cumbrera", [3, 18, 18, 3], "0.5", "prepintada-blanco", 24),
      ],
    },
    {
      folio: "CG-1037",
      cliente: "Luis Fuentes (Maestro)",
      telefono: "+56 9 7432 0098",
      etapa: "material",
      ...emision(2, "08:40"),
      items: [
        item("perfil_j", lados.perfilJ, "0.4", "zincalum", 18),
        item("inicio", lados.inicio, "0.4", "zincalum", 18),
      ],
    },
    {
      folio: "CG-1038",
      cliente: usuarioDemo.nombre,
      telefono: usuarioDemo.telefono,
      etapa: "corte",
      ...emision(2, "12:30"),
      items: [
        item("cortagotera", lados.cortagotera, "0.4", "zincalum", 13),
        item("perfil_j", lados.perfilJ, "0.4", "prepintada-grafito", 15.5),
      ],
    },
    {
      folio: "CG-1039",
      cliente: "Carolina Rojas Pino",
      telefono: "+56 9 6677 4412",
      etapa: "recoleccion",
      ...emision(diaLote(2), "08:10"),
      items: [
        item("cumbrera", lados.cumbrera, "0.4", "prepintada-rojo", 16, true),
        item("cortagotera", lados.cortagotera, "0.4", "prepintada-rojo", 16),
      ],
    },
    {
      folio: "CG-1040",
      cliente: "Rosa Valenzuela Díaz",
      telefono: "+56 9 5128 9930",
      etapa: "recoleccion",
      ...emision(diaLote(1), "08:45"),
      items: [item("perfil_l", lados.perfilL, "0.4", "zincalum", 12)],
    },
    {
      folio: "CG-1041",
      cliente: "Ferretería El Maestro SpA",
      telefono: "+56 9 9345 6671",
      etapa: "recoleccion",
      ...emision(diaLote(1), "09:00"),
      items: [
        item("canaleta", lados.canaleta, "0.5", "prepintada-grafito", 30),
        item("esquinero", lados.esquinero, "0.5", "prepintada-grafito", 6),
      ],
    },
    {
      folio: "CG-1042",
      cliente: usuarioDemo.nombre,
      telefono: usuarioDemo.telefono,
      etapa: "recoleccion",
      ...emision(0, "09:15"),
      items: [
        item("canaleta", lados.canaleta, "0.4", "zincalum", 12),
        item("cumbrera", lados.cumbrera, "0.4", "prepintada-rojo", 11),
        item("inicio", lados.inicio, "0.4", "zincalum", 12),
      ],
    },
    {
      folio: "CG-1043",
      cliente: "Héctor Salinas Vera",
      telefono: "+56 9 8211 3307",
      etapa: "recoleccion",
      ...emision(0, "10:40"),
      items: [item("cortagotera", [2, 6, 10, 14, 4], "0.4", "prepintada-verde", 20, true)],
    },
  ];

  return pedidos.map((pedido) => ({
    ...pedido,
    boleta: numeroBoleta(pedido.folio),
    total: pedido.items.reduce((suma, linea) => suma + linea.subtotal, 0),
  }));
}

function crearCarritoDemo() {
  return [item("canaleta", lados.canaleta, "0.4", "prepintada-rojo", 14)];
}

// Sin ?demo un visitante nuevo parte con el carrito vacío. El ejemplo queda solo para la demo.
function carritoInicial(demo) {
  return demo ? crearCarritoDemo() : [];
}

function esLineaPrecargada(linea, ejemplo) {
  if (!linea || linea.perfilId !== ejemplo.perfilId || linea.metros !== ejemplo.metros) return false;
  if (linea.espesor !== ejemplo.espesor || linea.materialId !== ejemplo.materialId) return false;
  if (Boolean(linea.molde) !== Boolean(ejemplo.molde)) return false;
  const medidas = (lista) => (lista || []).map((lado) => lado.cm).join(",");
  return medidas(linea.lados) === medidas(ejemplo.lados);
}

// Un carrito armado por la persona se conserva. El ejemplo precargado solo se ve con ?demo.
function carritoAlCargar(demo, guardado) {
  if (guardado && Array.isArray(guardado.carrito)) {
    const ejemplo = crearCarritoDemo()[0];
    const precargado = guardado.carrito.length === 1 && esLineaPrecargada(guardado.carrito[0], ejemplo);
    if (!demo && precargado) return [];
    return guardado.carrito;
  }
  return carritoInicial(demo);
}

function crearSolicitudesEspecialesDemo() {
  return [];
}

function folioEspecialCorto() {
  // Ocho caracteres bastan para el folio. randomUUID solo existe en https o localhost.
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `CE-${uuid.replace(/-/g, "").slice(0, 8)}`;
  return `CE-${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;
}

function crearSolicitudEspecial(datos) {
  // El adjunto se usa solo como vista previa y nunca forma parte de los datos guardados.
  return {
    folio: folioEspecialCorto(),
    estado: "Cotización especial pendiente",
    ...emisionActual(),
    descripcion: datos.descripcion,
    medidas: { largo: datos.largo, ancho: datos.ancho, alto: datos.alto },
    cantidad: datos.cantidad,
    unidad: datos.unidad,
    material: datos.material,
    espesor: datos.espesor,
    nombre: datos.nombre,
    telefono: datos.telefono,
    comuna: datos.comuna,
    angulos: datos.angulos || null,
  };
}

function crearCuentaDemo() {
  return {
    perfil: {
      nombre: usuarioDemo.nombre,
      razonSocial: usuarioDemo.razonSocial,
      rut: usuarioDemo.rut,
      tipo: usuarioDemo.tipo,
      telefono: usuarioDemo.telefono,
      email: usuarioDemo.email,
    },
    direcciones: [
      {
        id: "dir-alerce",
        alias: "Obra Casa Alerce Norte",
        tipo: "Obra en terreno",
        direccion: "Av. Transversal 1420, Lote 8, Alerce Norte · Puerto Montt",
        referencia: "Casa esquina de 2 pisos, portón metálico gris. Recibe Maestro Carlos (+56 9 8120 4410).",
        principal: true,
      },
      {
        id: "dir-tepual",
        alias: "Bodega Camino a Tepual",
        tipo: "Bodega",
        direccion: "Por confirmar",
        referencia: "Acopio de materiales para obras de invierno. Horario: Por confirmar.",
        principal: false,
      },
      {
        id: "dir-taller",
        alias: "Retiro habitual en Taller Colegual",
        tipo: "Retiro en taller",
        direccion: "Pje. Edmundo Lobos 5507294, 5480000 Puerto Montt, Los Lagos (plus code G2WX+9J)",
        referencia: "Retira Juan Pérez en camioneta Nissan NP300 con porta-escala para tiras de 3 m.",
        principal: false,
      },
    ],
    seguridad: {
      ultimoCambioClave: "hace 3 meses",
      dosFactores: false,
      notificaciones: {
        avisoListo: true,
        avisoLote: true,
        correoBoleta: true,
        avisoTickets: true,
      },
      sesiones: [
        {
          id: "ses-actual",
          dispositivo: "Windows 11 · Chrome (Este equipo)",
          ubicacion: "Puerto Montt, Los Lagos",
          actividad: "Activa ahora",
          actual: true,
        },
        {
          id: "ses-movil",
          dispositivo: "Android · Chrome Móvil (Terreno Alerce)",
          ubicacion: "Puerto Montt, Los Lagos",
          actividad: "Hace 2 horas",
          actual: false,
        },
      ],
    },
    tickets: [
      {
        id: "T-204",
        folioPedido: "CG-1042",
        boleta: "B-001042",
        asunto: "¿Puedo cambiar los 12 mts de Canaleta a color Negro antes de que compren el lote?",
        categoria: "Cambio antes de compra de lote",
        estado: "abierto",
        actualizado: "Hoy · 09:40",
        mensajes: [
          {
            autor: "cliente",
            nombre: "Juan Pérez",
            fecha: "Hoy · 09:40",
            texto:
              "Hola maestros, acabo de emitir la boleta #B-001042 que sigue en recolección de lote. El dueño de la obra pidió cambiar los 12 mts de Canaleta 0.4 mm de Zincalum a Prepintada Gris Grafito / Negro. ¿Alcanzo antes de que cierren el lote?",
          },
        ],
      },
      {
        id: "T-198",
        folioPedido: "CG-1038",
        boleta: "B-001038",
        asunto: 'Duda con medida de corte en terreno para el Perfil "J" en ventana',
        categoria: "Duda con medida de corte en terreno",
        estado: "respondido",
        actualizado: "Ayer · 17:15",
        mensajes: [
          {
            autor: "cliente",
            nombre: "Juan Pérez",
            fecha: "Ayer · 15:20",
            texto:
              'Consulta al taller: en el pedido CG-1038 dejé el Perfil "J" con base B de 4 cm, pero vamos a instalar siding de fibrocemento con listoneado doble. ¿Conviene subir el frente C o se mantiene igual?',
          },
          {
            autor: "taller",
            nombre: "Robinson · Jefe de Plegados Colegual",
            fecha: "Ayer · 17:15",
            texto:
              "Don Juan, con base B de 4 cm entra holgado el siding más el retorno. Mantenemos 12 + 4 + 5 + 1 = 22 cm para que no le suba el desarrollo ni el precio. Sus tiras de 3 m entran a plegadora hoy en la tarde.",
          },
        ],
      },
      {
        id: "T-185",
        folioPedido: "CG-1029",
        boleta: "B-001029",
        asunto: "Confirmar retiro en camioneta con porta-escala mañana a las 09:00",
        categoria: "Coordinación de retiro en taller",
        estado: "cerrado",
        actualizado: "Hace 4 días",
        mensajes: [
          {
            autor: "cliente",
            nombre: "Juan Pérez",
            fecha: "Hace 4 días · 10:05",
            texto:
              "Paso mañana a primera hora por los 18 mts de Esquinero y los 4 mts de Perfil L en Verde Inglés. ¿Están listos los 2 moldes en cartón?",
          },
          {
            autor: "taller",
            nombre: "Taller de Plegados Colegual",
            fecha: "Hace 4 días · 10:45",
            texto:
              "Todo listo don Juan. Las 6 tiras de Esquinero y las 2 de Perfil L están flejadas con film protector, y los 2 moldes de cartón quedaron marcados con las letras A-B-C-D. Lo esperamos en el portón de carga.",
          },
        ],
      },
    ],
  };
}

export {
  usuarioDemo,
  etapas,
  calcularLoteActual,
  formatoFechaCorta,
  emisionActual,
  numeroBoleta,
  haceCuanto,
  crearPedidosDemo,
  crearCarritoDemo,
  carritoInicial,
  carritoAlCargar,
  crearCuentaDemo,
  crearSolicitudesEspecialesDemo,
  crearSolicitudEspecial,
};
