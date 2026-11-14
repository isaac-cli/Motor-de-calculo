// Al abrir una página que no carga el cotizador, igual se botan los datos vencidos.
import { caducarMockup } from "./mockup-caducidad.js?v=3";
import { purgarPersonalesSiCaducaron } from "./mesa-estado.js?v=3";

caducarMockup();
purgarPersonalesSiCaducaron();
