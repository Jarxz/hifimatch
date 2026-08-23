/**
 * Geometría de sala — disposición simétrica (o manual, arrastrada por el
 * usuario), distancia de escucha y primeras reflexiones, desde una sala
 * rectangular rígida. Fórmula y vector de prueba: docs/motor-mvp.md
 * sección 4.
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

/**
 * Distancia mínima entre un parlante arrastrado a mano (o el punto dulce
 * derivado de esa posición) y cualquier muro de la sala — evita soltar un
 * parlante literalmente pegado a una pared (contacto físico irreal) y
 * evita que el método de imagen especular degenere cuando el parlante
 * coincide con el plano del muro. Criterio del sitio: un piso razonable de
 * instalación (aire detrás/al costado del parlante), no una medición.
 */
export const MARGEN_MURO_MIN_M = 0.15;

/** Recorta un punto para que no quede a menos de `margen` de ningún muro. */
export function clampPosicionParlante(p: Punto, sala: Sala, margen = MARGEN_MURO_MIN_M): Punto {
  return { x: clamp(margen, p.x, sala.anchoM - margen), y: clamp(margen, p.y, sala.largoM - margen) };
}

function distancia3(a: Punto3, b: Punto3): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/** Ángulo (grados) que subtienden dos puntos vistos desde un vértice — acá,
 * el ángulo del triángulo de escucha visto desde el punto dulce. Geometría
 * 2D (x,y): parlante y oído comparten altura por supuesto del sitio
 * (ALTURA_ESCUCHA_M), así que el ángulo vertical es siempre 0 y no hace
 * falta la tercera dimensión. `Math.min(1, Math.max(-1, ...))` cubre el
 * caso borde de error de punto flotante empujando el coseno levísimamente
 * fuera de [-1,1] cuando el ángulo real es 0° o 180° exactos. */
function anguloEntreGrados(vertice: Punto, a: Punto, b: Punto): number {
  const v1x = a.x - vertice.x;
  const v1y = a.y - vertice.y;
  const v2x = b.x - vertice.x;
  const v2y = b.y - vertice.y;
  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);
  if (mag1 < 1e-9 || mag2 < 1e-9) return 0; // parlante ~coincidente con la escucha: sin ángulo definido
  const cosTheta = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (mag1 * mag2)));
  return (Math.acos(cosTheta) * 180) / Math.PI;
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
  /** Distancia directa parlante izquierdo→escucha — histórico, es la que
   * alimenta a `evaluarPotencia()`. Con el punto dulce derivado (candado
   * cerrado, ver `calcularDisposicionManual`) coincide con
   * `distanciaEscuchaDerM`; con el asiento libre (`calcularDisposicion
   * AsientoManual`) puede diferir — ver esos dos campos nuevos. */
  distanciaEscuchaM: number; // ← alimenta directamente a evaluarPotencia()
  /** Distancia directa de CADA parlante a la escucha — siempre calculadas
   * las dos (aditivo, no reemplaza a `distanciaEscuchaM`). Iguales entre sí
   * cuando el punto dulce está sobre la mediatriz de los parlantes (el
   * caso derivado, siempre); pueden diferir sólo cuando el asiento se
   * arrastra de forma independiente (`calcularDisposicionAsientoManual`).
   * `evaluarPotencia()` las usa para sumar los dos canales como fuentes
   * descorrelacionadas en vez de asumir una distancia única — ver
   * `potencia.ts`. */
  distanciaEscuchaIzqM: number;
  distanciaEscuchaDerM: number;
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
  /** Reflexión en el muro FRONTAL (detrás de cada parlante, no del
   * oyente) — mismo método de imagen especular que la trasera, reflejando
   * el punto de escucha a través de y=0 en vez de y=largoM. Es el SBIR
   * ("speaker boundary interference response") clásico: la superficie más
   * audible al mover un parlante es la que tiene detrás, no la que tiene
   * detrás el oyente. */
  reflexionFrontalIzq: Punto;
  reflexionFrontalDer: Punto;
  distanciaFrontalIzqM: number;
  distanciaFrontalDerM: number;
  /** Ángulo (grados) que subtienden los dos parlantes vistos desde el
   * punto dulce — el "ángulo del triángulo de escucha". Geometría pura, sin
   * severidad acá (ver `colocacion.ts`, `evaluarAnguloEscucha`, que sí
   * juzga este número contra un rango declarado). Con la disposición
   * automática de este sitio (factor 1,2 en `filaEscuchaM`) da ~45° en
   * cualquier sala — no 60° (la convención de triángulo equilátero
   * estéreo) — porque ese factor nunca se declaró en función del ángulo;
   * se deja así a propósito (no es un error, hay quien prefiere un
   * escenario más angosto) y se declara en vez de corregirse en silencio. */
  anguloEscuchaGrados: number;
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

/**
 * Punto dulce derivado de dos posiciones de parlante cualesquiera —
 * generaliza la fórmula simétrica de calcularDisposicion() (que pone el
 * punto dulce sobre la línea central de la sala, a `separacionM × 1,2` de
 * distancia detrás de los parlantes) al caso de parlantes movidos de forma
 * independiente. El punto dulce va sobre la **mediatriz** del segmento que
 * une los dos parlantes — el lugar geométrico de los puntos equidistantes
 * de ambos, sea cual sea su posición u orientación — a esa misma distancia
 * del punto medio entre ellos, del lado que se aleja de la pared frontal.
 *
 * Consecuencia (no un supuesto aparte): como el punto dulce queda por
 * construcción sobre la mediatriz, cada parlante queda exactamente
 * equidistante de él — no hace falta declarar qué distancia usar cuando
 * los parlantes están a distinta distancia del oyente, el caso simplemente
 * no existe. Cuando ambos parlantes comparten la misma coordenada Y (el
 * caso simétrico de siempre), esta fórmula se reduce algebraicamente a la
 * de calcularDisposicion() — mismo resultado, no una coincidencia numérica
 * (ver sala.test.ts).
 */
export function puntoDulceDesdeParlantes(parlanteIzq: Punto, parlanteDer: Punto, sala: Sala): Punto {
  const medio: Punto = { x: (parlanteIzq.x + parlanteDer.x) / 2, y: (parlanteIzq.y + parlanteDer.y) / 2 };
  const dx = parlanteDer.x - parlanteIzq.x;
  const dy = parlanteDer.y - parlanteIzq.y;
  const separacionM = Math.hypot(dx, dy);
  // Parlantes prácticamente en el mismo punto: no hay dirección definida —
  // se usa "derecho hacia atrás" como caso de borde declarado, en vez de
  // producir NaN.
  const dirX = separacionM > 0.01 ? dx / separacionM : 1;
  const dirY = separacionM > 0.01 ? dy / separacionM : 0;
  // Perpendicular al segmento — dos candidatos (±90°); se elige el que
  // apunta hacia adentro de la sala (mayor componente +Y, alejándose del
  // muro frontal en y=0), no hacia la pared frontal.
  const candA: Punto = { x: -dirY, y: dirX };
  const candB: Punto = { x: dirY, y: -dirX };
  const perp = candA.y >= candB.y ? candA : candB;
  const offsetM = clamp(1.0, separacionM * 1.2, sala.largoM - 0.6 - medio.y);
  return clampPosicionParlante({ x: medio.x + perp.x * offsetM, y: medio.y + perp.y * offsetM }, sala);
}

/**
 * Ensambla una DisposicionSala completa (reflexiones + distancias en las 6
 * superficies) a partir de dos parlantes y un punto dulce ya resueltos —
 * usado tanto por calcularDisposicion() (parlantes simétricos, derivados
 * de las dimensiones) como por calcularDisposicionManual() (parlantes
 * arrastrados a mano). No decide POSICIONES, sólo geometría de reflexión a
 * partir de posiciones ya dadas.
 */
function ensamblarDisposicion(
  sala: Sala,
  parlanteIzq: Punto,
  parlanteDer: Punto,
  puntoDulce: Punto,
  centroXM: number,
  separacionM: number,
  offsetFrenteM: number
): DisposicionSala {
  const { anchoM: W, largoM: L, altoM: H } = sala;
  const h = ALTURA_ESCUCHA_M;
  const spkIzq3: Punto3 = { x: parlanteIzq.x, y: parlanteIzq.y, z: h };
  const spkDer3: Punto3 = { x: parlanteDer.x, y: parlanteDer.y, z: h };
  const escucha3: Punto3 = { x: puntoDulce.x, y: puntoDulce.y, z: h };

  const lateralIzq = reflexionEnPlano(spkIzq3, escucha3, 'x', 0);
  const lateralDer = reflexionEnPlano(spkDer3, escucha3, 'x', W);
  const traseraIzq = reflexionEnPlano(spkIzq3, escucha3, 'y', L);
  const traseraDer = reflexionEnPlano(spkDer3, escucha3, 'y', L);
  const frontalIzq = reflexionEnPlano(spkIzq3, escucha3, 'y', 0);
  const frontalDer = reflexionEnPlano(spkDer3, escucha3, 'y', 0);
  const pisoIzq = reflexionEnPlano(spkIzq3, escucha3, 'z', 0);
  const pisoDer = reflexionEnPlano(spkDer3, escucha3, 'z', 0);
  const techoIzq = reflexionEnPlano(spkIzq3, escucha3, 'z', H);
  const techoDer = reflexionEnPlano(spkDer3, escucha3, 'z', H);

  return {
    centroXM,
    separacionM,
    offsetFrenteM,
    filaEscuchaM: puntoDulce.y,
    parlanteIzq,
    parlanteDer,
    puntoDulce,
    distanciaEscuchaM: distancia3(spkIzq3, escucha3),
    distanciaEscuchaIzqM: distancia3(spkIzq3, escucha3),
    distanciaEscuchaDerM: distancia3(spkDer3, escucha3),
    reflexionIzq: { x: lateralIzq.punto.x, y: lateralIzq.punto.y },
    reflexionDer: { x: lateralDer.punto.x, y: lateralDer.punto.y },
    volumenM3: W * L * H,

    alturaM: h,
    distanciaLateralIzqM: lateralIzq.distanciaM,
    distanciaLateralDerM: lateralDer.distanciaM,
    reflexionTraseraIzq: { x: traseraIzq.punto.x, y: traseraIzq.punto.y },
    reflexionTraseraDer: { x: traseraDer.punto.x, y: traseraDer.punto.y },
    distanciaTraseraIzqM: traseraIzq.distanciaM,
    distanciaTraseraDerM: traseraDer.distanciaM,
    reflexionFrontalIzq: { x: frontalIzq.punto.x, y: frontalIzq.punto.y },
    reflexionFrontalDer: { x: frontalDer.punto.x, y: frontalDer.punto.y },
    distanciaFrontalIzqM: frontalIzq.distanciaM,
    distanciaFrontalDerM: frontalDer.distanciaM,
    anguloEscuchaGrados: anguloEntreGrados(puntoDulce, parlanteIzq, parlanteDer),
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

export function calcularDisposicion(sala: Sala): DisposicionSala {
  const { anchoM: W, largoM: L } = sala;
  const centroXM = W / 2;
  const separacionM = clamp(1.5, 0.55 * W, Math.min(3.0, W - 1.0));
  const offsetFrenteM = clamp(0.5, 0.15 * L, 1.2);
  const filaEscuchaM = clamp(offsetFrenteM + 1.0, offsetFrenteM + separacionM * 1.2, L - 0.6);

  const xL = centroXM - separacionM / 2;
  const xR = centroXM + separacionM / 2;

  return ensamblarDisposicion(
    sala,
    { x: xL, y: offsetFrenteM },
    { x: xR, y: offsetFrenteM },
    { x: centroXM, y: filaEscuchaM },
    centroXM,
    separacionM,
    offsetFrenteM
  );
}

/**
 * Disposición a partir de dos parlantes movidos a mano (arrastre en la
 * vista Superior), en vez de la disposición simétrica derivada sólo de las
 * dimensiones de la sala. El punto dulce NO se recibe como parámetro: se
 * deriva solo de las posiciones de los parlantes (puntoDulceDesdeParlantes)
 * — el usuario reposiciona parlantes, no el punto de escucha directamente.
 * Los parlantes de entrada se recortan al margen de muro (clampPosicionParlante)
 * por si el llamador no lo hizo ya — el motor no confía ciegamente en
 * coordenadas externas.
 */
export function calcularDisposicionManual(sala: Sala, parlanteIzqEntrada: Punto, parlanteDerEntrada: Punto): DisposicionSala {
  const parlanteIzq = clampPosicionParlante(parlanteIzqEntrada, sala);
  const parlanteDer = clampPosicionParlante(parlanteDerEntrada, sala);
  const puntoDulce = puntoDulceDesdeParlantes(parlanteIzq, parlanteDer, sala);
  const centroXM = (parlanteIzq.x + parlanteDer.x) / 2;
  const offsetFrenteM = (parlanteIzq.y + parlanteDer.y) / 2;
  const separacionM = Math.hypot(parlanteDer.x - parlanteIzq.x, parlanteDer.y - parlanteIzq.y);
  return ensamblarDisposicion(sala, parlanteIzq, parlanteDer, puntoDulce, centroXM, separacionM, offsetFrenteM);
}

/**
 * Disposición con el asiento (punto de escucha) desbloqueado y arrastrado
 * de forma independiente de los parlantes — "candado" abierto, ver
 * `apps/web`. A diferencia de `calcularDisposicionManual()` (que siempre
 * DERIVA el punto dulce de los parlantes vía `puntoDulceDesdeParlantes`,
 * sobre la mediatriz), acá el asiento se recibe como tercer parámetro y se
 * usa tal cual — recortado al mismo margen de muro que un parlante
 * (`clampPosicionParlante`, mismo criterio: no tiene sentido un asiento
 * pegado a una pared, y el método de imagen especular degenera si
 * coincide con el plano de un muro).
 *
 * Consecuencia física, no un detalle de implementación: con el asiento
 * libre, ya no es cierto que ambos parlantes queden equidistantes del
 * oyente — `distanciaEscuchaIzqM`/`distanciaEscuchaDerM` (siempre
 * calculadas, ver `ensamblarDisposicion`) pueden diferir, y
 * `evaluarPotencia()` las combina como dos fuentes descorrelacionadas en
 * vez de asumir una distancia única. La asimetría también aparece en el
 * camino DIRECTO de cada parlante (antes, con el punto dulce siempre
 * derivado sobre la mediatriz, esto era estructuralmente imposible) — ver
 * `colocacion.ts`, `evaluarAsimetria()`.
 */
export function calcularDisposicionAsientoManual(sala: Sala, parlanteIzqEntrada: Punto, parlanteDerEntrada: Punto, asientoEntrada: Punto): DisposicionSala {
  const parlanteIzq = clampPosicionParlante(parlanteIzqEntrada, sala);
  const parlanteDer = clampPosicionParlante(parlanteDerEntrada, sala);
  const puntoDulce = clampPosicionParlante(asientoEntrada, sala);
  const centroXM = (parlanteIzq.x + parlanteDer.x) / 2;
  const offsetFrenteM = (parlanteIzq.y + parlanteDer.y) / 2;
  const separacionM = Math.hypot(parlanteDer.x - parlanteIzq.x, parlanteDer.y - parlanteIzq.y);
  return ensamblarDisposicion(sala, parlanteIzq, parlanteDer, puntoDulce, centroXM, separacionM, offsetFrenteM);
}
