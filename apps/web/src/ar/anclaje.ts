/**
 * Anclaje de la geometría del motor (metros, marco de referencia de
 * sala.ts) al espacio real detectado por WebXR — puro, sin `three`, sin
 * DOM, sin `navigator.xr`. Convención de ejes: `Vec3` usa el sistema de
 * WebXR (`local-floor`), donde Y es "arriba" (alineado con la gravedad
 * real vía IMU) y X/Z son horizontales — DISTINTO del `Punto{x,y}` de
 * `sala.ts`, donde x/y son ambos horizontales (ancho/profundidad) y la
 * altura es un número aparte (`alturaM`). No confundir un `y` con otro:
 * por eso este módulo nunca importa `Punto` de sala.ts como si fuera un
 * `Vec3` — `anclarPunto()` es la única función que cruza los dos
 * sistemas, explícitamente.
 *
 * Calibración de 2 toques sobre el piso (ver docs/motor-mvp.md AR):
 * toque 1 fija el origen (esquina real frontal-izquierda), toque 2 marca
 * la esquina real frontal-derecha → define el eje "ancho". Que sea la
 * esquina real (no "cualquier punto a lo largo de la pared", como en la
 * primera versión) no es sólo por prolijidad: la distancia entre los 2
 * toques pasa a ser una medición real del ancho de la sala
 * (`medirAnchoM`, más abajo) — con un punto arbitrario a mitad de pared
 * esa distancia no significaría nada. La ambigüedad de las dos
 * perpendiculares candidatas
 * para "hacia el fondo de la sala" se resuelve con la POSICIÓN del
 * visor (el teléfono/cabeza, no hacia dónde mira) en el instante del
 * toque 2 — se elige el candidato que apunta desde la pared hacia donde
 * está parado quien calibra.
 *
 * Versión anterior de este módulo usaba la dirección de MIRADA de la
 * cámara para desambiguar, con una instrucción de "parado dentro de la
 * sala, mirando hacia el fondo" — probada en hardware real (primera
 * ronda de AR) y descartada: para tocar un punto de piso pegado a la
 * pared frontal, el usuario naturalmente inclina el teléfono hacia
 * abajo y hacia esa pared, no "hacia el fondo" — la mirada en ese
 * instante exacto resultó una señal poco confiable (el eje de
 * profundidad terminaba apuntando para el lado equivocado). La posición
 * del visor es mucho más estable: quien calibra está parado en algún
 * punto DENTRO de la sala durante todo el proceso, sin importar hacia
 * dónde apunte el teléfono en cada instante — ese hecho geométrico no
 * depende de un gesto que el usuario tenga que recordar.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Anclaje {
  origen: Vec3;
  ejeX: Vec3;
  ejeProfundidad: Vec3;
  arriba: Vec3;
}

const ARRIBA: Vec3 = { x: 0, y: 1, z: 0 };

/**
 * Eje X de emergencia cuando los dos toques caen prácticamente en el
 * mismo punto (sin dirección definida) — mismo criterio defensivo que ya
 * usa `puntoDulceDesdeParlantes` en sala.ts: un valor declarado, nunca
 * `NaN`. Arbitrario a propósito (no hay mejor opción sin más datos).
 */
const EJE_X_EMERGENCIA: Vec3 = { x: 1, y: 0, z: 0 };

/** Umbral de distancia horizontal entre los dos toques por debajo del
 * cual no hay dirección confiable — mismo orden de magnitud (2 cm) que
 * el margen de error típico de un hit-test de ARCore contra el piso. */
const DISTANCIA_MIN_TOQUES_M = 0.02;

function restar(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function sumar(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function escalar(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function cruz(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function producto(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** Descarta la componente vertical (Y) — "hacia dónde" en el plano del piso. */
function proyectarHorizontal(v: Vec3): Vec3 {
  return { x: v.x, y: 0, z: v.z };
}

function normalizarConFallback(v: Vec3, fallback: Vec3): Vec3 {
  const m = Math.hypot(v.x, v.y, v.z);
  return m > 1e-6 ? escalar(v, 1 / m) : fallback;
}

/**
 * Resuelve la base de anclaje a partir de los 2 toques de calibración.
 * `posicionVisor` es la posición del visor XR (cámara/cabeza, ver
 * `sesion.ts`, `renderer.xr.getCamera().position`) en el instante del
 * segundo toque — sólo se usa su componente horizontal, para desambiguar
 * cuál de las dos perpendiculares al eje X es "hacia el fondo de la
 * sala" (el candidato que apunta desde la línea de los 2 toques hacia
 * donde está parado quien calibra).
 */
export function resolverAnclaje(toque1: Vec3, toque2: Vec3, posicionVisor: Vec3): Anclaje {
  const deltaH = proyectarHorizontal(restar(toque2, toque1));
  const distanciaH = Math.hypot(deltaH.x, deltaH.z);
  const ejeX = distanciaH > DISTANCIA_MIN_TOQUES_M ? escalar(deltaH, 1 / distanciaH) : EJE_X_EMERGENCIA;

  // Perpendicular a ejeX en el plano horizontal: dos candidatos (±90°).
  // arriba×ejeX siempre tiene magnitud 1 (ambos son unitarios y
  // perpendiculares entre sí: ejeX es horizontal, arriba es vertical) —
  // no hace falta guardia de vector nulo acá.
  const candA = cruz(ARRIBA, ejeX);
  const candB = escalar(candA, -1);
  // Dirección desde el punto medio de los 2 toques hacia el visor —
  // geométricamente, "hacia adentro de la sala" (quien calibra está
  // parado ahí, no atravesando la pared). Degenerado sólo si el visor
  // cae exactamente sobre esa línea (perpendicular horizontal nula):
  // caso de borde declarado con el mismo default arbitrario (candA) que
  // el resto del módulo, nunca NaN.
  const medioH: Vec3 = { x: (toque1.x + toque2.x) / 2, y: 0, z: (toque1.z + toque2.z) / 2 };
  const haciaVisorH = normalizarConFallback(proyectarHorizontal(restar(posicionVisor, medioH)), candA);
  const ejeProfundidad = producto(candA, haciaVisorH) >= producto(candB, haciaVisorH) ? candA : candB;

  return { origen: toque1, ejeX, ejeProfundidad, arriba: ARRIBA };
}

/**
 * Traduce un punto del motor (metros, marco de sala.ts: x=ancho,
 * y=profundidad, altura aparte) a coordenadas del mundo real anclado.
 * Única función que cruza los dos sistemas de referencia — ver comentario
 * de cabecera.
 */
export function anclarPunto(anclaje: Anclaje, punto: { x: number; y: number }, alturaM: number): Vec3 {
  return sumar(sumar(sumar(anclaje.origen, escalar(anclaje.ejeX, punto.x)), escalar(anclaje.ejeProfundidad, punto.y)), escalar(anclaje.arriba, alturaM));
}

/**
 * Medición real del ancho de la sala, a partir de los mismos 2 toques
 * que ya calibran el anclaje (toque1=esquina frontal-izquierda,
 * toque2=esquina frontal-derecha) — sin pedir ningún toque extra. Sólo
 * la componente horizontal, mismo criterio que el resto del módulo.
 */
export function medirAnchoM(toque1: Vec3, toque2: Vec3): number {
  const d = proyectarHorizontal(restar(toque2, toque1));
  return Math.hypot(d.x, d.z);
}

/**
 * Medición real de la altura de la sala — un tercer toque OPCIONAL en
 * la parte de arriba de la esquina ya tocada (donde esa pared llega al
 * techo), ver `sesion.ts`. `pisoRef` es cualquier toque ya hecho a nivel
 * de piso (normalmente toque1); `techoRef` es el toque nuevo, arriba.
 */
export function medirAlturaM(pisoRef: Vec3, techoRef: Vec3): number {
  return techoRef.y - pisoRef.y;
}

/** Cotas de sanidad para las mediciones reales — descartan un hit-test
 * claramente erróneo (superficie mal detectada, toque fuera de la sala)
 * sin pretender validar que la medida en sí sea exacta. Declaradas, no
 * ocultas: si una medición cae afuera, `sesion.ts` avisa y mantiene la
 * medida tipeada en la web en vez de aplicar un número sin sentido. */
export const ANCHO_MEDIDO_MIN_M = 0.5;
export const ANCHO_MEDIDO_MAX_M = 15;
export const ALTURA_MEDIDA_MIN_M = 1.5;
export const ALTURA_MEDIDA_MAX_M = 5;

export function anchoMedidoValido(anchoM: number): boolean {
  return Number.isFinite(anchoM) && anchoM >= ANCHO_MEDIDO_MIN_M && anchoM <= ANCHO_MEDIDO_MAX_M;
}

export function alturaMedidaValida(alturaM: number): boolean {
  return Number.isFinite(alturaM) && alturaM >= ALTURA_MEDIDA_MIN_M && alturaM <= ALTURA_MEDIDA_MAX_M;
}
