/**
 * Geometría de sala — disposición simétrica, distancia de escucha y primeras
 * reflexiones, desde una sala rectangular rígida. Fórmula y vector de prueba:
 * docs/motor-mvp.md sección 4.
 *
 * Disciplina (ya declarada en el doc): esto predice desde una sala rígida y
 * se equivoca fácil. No es una regla de compatibilidad con severidad — es
 * disposición de referencia, que se afina midiendo.
 */

function clamp(lo: number, v: number, hi: number): number {
  return Math.max(lo, Math.min(v, hi));
}

export interface Sala {
  anchoM: number; // W — a lo ancho, eje x
  largoM: number; // L — de adelante hacia atrás, eje y (0 = muro frontal)
  altoM: number; // H
}

export interface Punto {
  x: number;
  y: number;
}

interface Punto3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Altura de oído sentado y altura del centro acústico del parlante — se
 * asumen iguales (parlante instalado a la altura del oído, la recomendación
 * estándar de puesta a punto) para poder calcular reflexiones de techo y
 * piso sin depender de una altura por equipo que el catálogo no tiene.
 * Criterio del sitio, no una medición de la sala o el equipo real.
 */
export const ALTURA_ESCUCHA_M = 1.0;

function distancia3(a: Punto3, b: Punto3): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/**
 * Punto de reflexión e imagen especular en un plano perpendicular a un eje
 * (x=cte para muros laterales, y=cte para el muro trasero, z=cte para techo
 * y piso) — método de imagen especular estándar en acústica de salas:
 * reflejar el punto de escucha a través del plano y trazar la recta desde
 * el parlante; donde esa recta cruza el plano es el punto de reflexión, y
 * la distancia parlante→espejo es igual a la distancia real del camino
 * reflejado completo (parlante→reflexión→escucha).
 */
function reflexionEnPlano(parlante: Punto3, escucha: Punto3, eje: 'x' | 'y' | 'z', valorPlano: number): { punto: Punto3; distanciaM: number } {
  const espejo: Punto3 = { ...escucha, [eje]: 2 * valorPlano - escucha[eje] };
  const t = (valorPlano - parlante[eje]) / (espejo[eje] - parlante[eje]);
  const punto: Punto3 = {
    x: parlante.x + t * (espejo.x - parlante.x),
    y: parlante.y + t * (espejo.y - parlante.y),
    z: parlante.z + t * (espejo.z - parlante.z),
  };
  return { punto, distanciaM: distancia3(parlante, espejo) };
}

export interface DisposicionSala {
  centroXM: number;
  separacionM: number;
  offsetFrenteM: number;
  filaEscuchaM: number;
  parlanteIzq: Punto;
  parlanteDer: Punto;
  puntoDulce: Punto;
  distanciaEscuchaM: number; // ← alimenta directamente a evaluarPotencia()
  reflexionIzq: Punto;
  reflexionDer: Punto;
  volumenM3: number;

  /** Altura de oído/parlante asumida (ALTURA_ESCUCHA_M) — expuesta para que
   * el renderer 3D no tenga que importar la constante por separado. */
  alturaM: number;
  distanciaLateralIzqM: number;
  distanciaLateralDerM: number;
  /** Reflexión en el muro trasero (detrás del punto de escucha) — mismo
   * método de imagen especular que las laterales, sólo que reflejando en el
   * eje Y contra `largoM` en vez de en X contra 0/`anchoM`. */
  reflexionTraseraIzq: Punto;
  reflexionTraseraDer: Punto;
  distanciaTraseraIzqM: number;
  distanciaTraseraDerM: number;
  /** Reflexión en el piso (z=0) y el techo (z=altoM). Como parlante y oído
   * se asumen a la misma altura, el punto de reflexión cae siempre en el
   * punto medio horizontal entre el parlante y el punto dulce — no es un
   * caso especial, es lo que da la misma fórmula de imagen especular
   * cuando ambos extremos comparten altura. */
  reflexionTechoIzq: Punto;
  reflexionTechoDer: Punto;
  distanciaTechoIzqM: number;
  distanciaTechoDerM: number;
  reflexionPisoIzq: Punto;
  reflexionPisoDer: Punto;
  distanciaPisoIzqM: number;
  distanciaPisoDerM: number;
}

export function calcularDisposicion(sala: Sala): DisposicionSala {
  const { anchoM: W, largoM: L, altoM: H } = sala;
  const centroXM = W / 2;
  const separacionM = clamp(1.5, 0.55 * W, Math.min(3.0, W - 1.0));
  const offsetFrenteM = clamp(0.5, 0.15 * L, 1.2);
  const filaEscuchaM = clamp(offsetFrenteM + 1.0, offsetFrenteM + separacionM * 1.2, L - 0.6);

  const xL = centroXM - separacionM / 2;
  const xR = centroXM + separacionM / 2;

  const distanciaEscuchaM = Math.sqrt(
    (separacionM / 2) ** 2 + (filaEscuchaM - offsetFrenteM) ** 2
  );

  // Primer punto de reflexión en los muros laterales (método de la imagen espejo).
  const t = xL / (xL + centroXM);
  const rpy = offsetFrenteM + t * (filaEscuchaM - offsetFrenteM);

  const h = ALTURA_ESCUCHA_M;
  const spkIzq3: Punto3 = { x: xL, y: offsetFrenteM, z: h };
  const spkDer3: Punto3 = { x: xR, y: offsetFrenteM, z: h };
  const escucha3: Punto3 = { x: centroXM, y: filaEscuchaM, z: h };

  const lateralIzq = reflexionEnPlano(spkIzq3, escucha3, 'x', 0);
  const lateralDer = reflexionEnPlano(spkDer3, escucha3, 'x', W);
  const traseraIzq = reflexionEnPlano(spkIzq3, escucha3, 'y', L);
  const traseraDer = reflexionEnPlano(spkDer3, escucha3, 'y', L);
  const pisoIzq = reflexionEnPlano(spkIzq3, escucha3, 'z', 0);
  const pisoDer = reflexionEnPlano(spkDer3, escucha3, 'z', 0);
  const techoIzq = reflexionEnPlano(spkIzq3, escucha3, 'z', H);
  const techoDer = reflexionEnPlano(spkDer3, escucha3, 'z', H);

  return {
    centroXM,
    separacionM,
    offsetFrenteM,
    filaEscuchaM,
    parlanteIzq: { x: xL, y: offsetFrenteM },
    parlanteDer: { x: xR, y: offsetFrenteM },
    puntoDulce: { x: centroXM, y: filaEscuchaM },
    distanciaEscuchaM,
    reflexionIzq: { x: 0, y: rpy },
    reflexionDer: { x: W, y: rpy },
    volumenM3: W * L * H,

    alturaM: h,
    distanciaLateralIzqM: lateralIzq.distanciaM,
    distanciaLateralDerM: lateralDer.distanciaM,
    reflexionTraseraIzq: { x: traseraIzq.punto.x, y: traseraIzq.punto.y },
    reflexionTraseraDer: { x: traseraDer.punto.x, y: traseraDer.punto.y },
    distanciaTraseraIzqM: traseraIzq.distanciaM,
    distanciaTraseraDerM: traseraDer.distanciaM,
    reflexionTechoIzq: { x: techoIzq.punto.x, y: techoIzq.punto.y },
    reflexionTechoDer: { x: techoDer.punto.x, y: techoDer.punto.y },
    distanciaTechoIzqM: techoIzq.distanciaM,
    distanciaTechoDerM: techoDer.distanciaM,
    reflexionPisoIzq: { x: pisoIzq.punto.x, y: pisoIzq.punto.y },
    reflexionPisoDer: { x: pisoDer.punto.x, y: pisoDer.punto.y },
    distanciaPisoIzqM: pisoIzq.distanciaM,
    distanciaPisoDerM: pisoDer.distanciaM,
  };
}
