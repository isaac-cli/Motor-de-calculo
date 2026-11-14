// Zonas de la obra y su perfil. Separado del visor 3D para no evaluarlo al abrir el cotizador.
const zonasObra = [
  {
    numero: 1,
    perfilId: "cumbrera",
    etiqueta: "Cumbrera",
    ubicacion: "Cresta del techo",
    problema: "Tapa la unión de las dos aguas para que no entre lluvia ni viento por la punta del techo.",
    ancla: [4.2, 3.0, 5.06],
    anclaPin: [3.6, 2.2, 6.25],
    vistaIdeal: { yaw: 0.62, pitch: 0.46 },
  },
  {
    numero: 2,
    perfilId: "canaleta",
    etiqueta: "Canaleta",
    ubicacion: "Borde del alero, bajo la cubierta",
    problema: "Recibe el agua que cae del techo y la lleva a la bajada, lejos de muros y fundaciones.",
    ancla: [1.7, 6.66, 2.48],
    anclaPin: [-0.4, 8.1, 3.15],
    vistaIdeal: { yaw: 0.55, pitch: 0.38 },
  },
  {
    numero: 3,
    perfilId: "cortagotera",
    etiqueta: "Cortagotera",
    ubicacion: "Alero",
    problema: "Hace que la gota caiga lejos de la tapa y del muro, sin devolverse por debajo de la plancha.",
    ancla: [10.62, 3.2, 2.2],
    anclaPin: [12.1, 3.8, 1.95],
    vistaIdeal: { yaw: 0.88, pitch: 0.38 },
  },
  {
    numero: 4,
    perfilId: "esquinero",
    etiqueta: "Esquinero",
    ubicacion: "Esquinas del muro",
    problema: "Sella las esquinas del revestimiento para que no se cuele viento ni lluvia.",
    ancla: [9.02, 6.02, 1.55],
    anclaPin: [10.2, 7.6, 0.85],
    vistaIdeal: { yaw: 0.72, pitch: 0.34 },
  },
  {
    numero: 5,
    perfilId: "inicio",
    etiqueta: "Inicio de muro",
    ubicacion: "Borde inferior del muro",
    problema: "Marca el nivel de partida del revestimiento y no deja entrar agua ni insectos por abajo.",
    ancla: [2.5, 6.03, 0.37],
    anclaPin: [1.2, 7.9, -0.25],
    vistaIdeal: { yaw: 0.48, pitch: 0.32 },
  },
  {
    numero: 6,
    perfilId: "perfil_j",
    etiqueta: 'Perfil "J" en ventana',
    ubicacion: "Contorno de ventanas y puertas",
    problema: "Recibe el borde de las planchas alrededor de ventanas y puertas, y esconde los cortes.",
    ancla: [6.1, 6.04, 1.32],
    anclaPin: [6.3, 8.0, 0.45],
    vistaIdeal: { yaw: 0.44, pitch: 0.32 },
  },
  {
    numero: 7,
    perfilId: "perfil_l",
    etiqueta: 'Perfil "L" en encuentro',
    ubicacion: "Encuentro de muro con techo",
    problema: "Remata donde el muro se junta con el techo y desvía el agua hacia afuera.",
    ancla: [9.08, 3.0, 2.72],
    anclaPin: [11.2, 1.1, 3.85],
    vistaIdeal: { yaw: 0.96, pitch: 0.44 },
  },
];

function zonaDePerfil(perfilId) {
  return zonasObra.find((zona) => zona.perfilId === perfilId) ?? null;
}

export { zonasObra, zonaDePerfil };
