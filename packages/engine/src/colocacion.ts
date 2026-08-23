/**
 * Efectos de colocación — consecuencias de DÓNDE están los parlantes y el
 * asiento, más allá de la distancia directa que ya usa `potencia.ts`:
 *
 * - **Filtro peine por reflexión**: cada una de las 5 reflexiones (frontal,
 *   lateral, trasera, piso, techo) llega al oído con un retardo respecto
 *   al sonido directo — la interferencia entre ambos cancela y refuerza
 *   frecuencias en peine, empezando en `c/(2Δ)`. Ponderado por la
 *   absorción real de esa superficie (ya declarada en `reverberacion.ts`):
 *   un nulo contra un panel acústico no es el mismo problema que uno
 *   contra vidrio.
 * - **Asimetría entre canales**: compara el camino de cada reflexión (y el
 *   directo) entre los dos parlantes — con el arrastre libre, ya no hay
 *   garantía de que sean iguales.
 * - **Ángulo de escucha**: el ángulo que subtienden los parlantes vistos
 *   desde el punto dulce, contra la convención de triángulo equilátero
 *   estéreo (60°).
 *
 * Misma salvedad que el resto del bloque de sala (CLAUDE.md, "Severidad y
 * bloque de sala"): geometría de sala rígida, primer orden, fuente puntual
 * y sin directividad. Techo `warn`, nunca `alert`. Ninguna de estas tres
 * reglas se sostiene como predicción de respuesta en frecuencia, y no se
 * suman entre sí para producir una curva total — cada una responde una
 * pregunta acotada, se verifica escuchando o midiendo.
 */
import { VELOCIDAD_SONIDO_MS } from './unidades.ts';
import type { DisposicionSala } from './sala.ts';
import { ABSORCION_MURO_BANDAS, ABSORCION_PISO_BANDAS, ABSORCION_TECHO_BANDAS, BANDAS_HZ } from './reverberacion.ts';
import type { Materiales } from './reverberacion.ts';

// ---------------------------------------------------------------------
// Filtro peine por reflexión (Cambio 3)
// ---------------------------------------------------------------------

export type NombreReflexion = 'frontal' | 'lateral' | 'trasera' | 'piso' | 'techo';

/**
 * Región de frecuencias donde un nulo de filtro peine es más perceptible
 * para el timbre — coloración de voces e instrumentos en la zona de
 * presencia/definición. Criterio del sitio, no una convención publicada.
 * Fuera de este rango el nulo/refuerzo se calcula igual (siempre expuesto
 * en el resultado) pero no sube la severidad — queda como información.
 */
export const FILTRO_PEINE_RANGO_MIN_HZ = 200;
export const FILTRO_PEINE_RANGO_MAX_HZ = 2000;

/**
 * Coeficiente de absorción (banda más cercana a la frecuencia del primer
 * nulo, de `BANDAS_HZ`) por debajo del cual una superficie cuenta como
 * "reflectante" para esta regla — criterio del sitio. Sin esta ponderación
 * un nulo contra un panel acústico pesaría lo mismo que uno contra vidrio
 * u hormigón, y la regla marcaría aviso en casi cualquier sala; el dato de
 * absorción por banda ya existe en `reverberacion.ts`, esta regla sólo lo
 * reusa.
 */
export const FILTRO_PEINE_ALPHA_REFLECTANTE_MAX = 0.15;

export interface ResultadoFiltroPeine {
  reflexion: NombreReflexion;
  canal: 'izq' | 'der';
  /** Camino reflejado − camino directo, en metros. */
  deltaM: number;
  primerNuloHz: number;
  primerRefuerzoHz: number;
  /** Coeficiente de absorción de la superficie reflectante, en la banda
   * más cercana a `primerNuloHz` — el dato que gradúa la severidad. */
  coeficienteAbsorcion: number;
  /** `warn` sólo cuando el nulo cae dentro del rango declarado
   * (`FILTRO_PEINE_RANGO_MIN_HZ`–`MAX_HZ`) Y la superficie es reflectante
   * (`coeficienteAbsorcion < FILTRO_PEINE_ALPHA_REFLECTANTE_MAX`). El
   * resto queda `ok` — calculado y expuesto, pero informativo. */
  severidad: 'ok' | 'warn';
}

function bandaMasCercana(hz: number): 0 | 1 | 2 {
  let mejorIdx: 0 | 1 | 2 = 0;
  let mejorDist = Infinity;
  BANDAS_HZ.forEach((banda, idx) => {
    const dist = Math.abs(hz - banda);
    if (dist < mejorDist) {
      mejorDist = dist;
      mejorIdx = idx as 0 | 1 | 2;
    }
  });
  return mejorIdx;
}

function coeficienteDeSuperficie(nombre: NombreReflexion, canal: 'izq' | 'der', materiales: Materiales, bandaIdx: 0 | 1 | 2): number {
  switch (nombre) {
    case 'frontal':
      return ABSORCION_MURO_BANDAS[materiales.muroFrontal][bandaIdx];
    case 'trasera':
      return ABSORCION_MURO_BANDAS[materiales.muroPosterior][bandaIdx];
    case 'lateral':
      return ABSORCION_MURO_BANDAS[canal === 'izq' ? materiales.muroIzquierdo : materiales.muroDerecho][bandaIdx];
    case 'piso':
      return ABSORCION_PISO_BANDAS[materiales.piso][bandaIdx];
    case 'techo':
      return ABSORCION_TECHO_BANDAS[materiales.techo][bandaIdx];
  }
}

/** Las 10 combinaciones (5 reflexiones × 2 canales), siempre en este mismo
 * orden — quien pinta la tarjeta puede confiar en la posición sin tener
 * que filtrar por nombre. */
export function evaluarFiltroPeine(disposicion: DisposicionSala, materiales: Materiales): ResultadoFiltroPeine[] {
  const c = VELOCIDAD_SONIDO_MS;
  const entradas: Array<{ reflexion: NombreReflexion; canal: 'izq' | 'der'; reflejadaM: number; directaM: number }> = [
    { reflexion: 'frontal', canal: 'izq', reflejadaM: disposicion.distanciaFrontalIzqM, directaM: disposicion.distanciaEscuchaIzqM },
    { reflexion: 'frontal', canal: 'der', reflejadaM: disposicion.distanciaFrontalDerM, directaM: disposicion.distanciaEscuchaDerM },
    { reflexion: 'lateral', canal: 'izq', reflejadaM: disposicion.distanciaLateralIzqM, directaM: disposicion.distanciaEscuchaIzqM },
    { reflexion: 'lateral', canal: 'der', reflejadaM: disposicion.distanciaLateralDerM, directaM: disposicion.distanciaEscuchaDerM },
    { reflexion: 'trasera', canal: 'izq', reflejadaM: disposicion.distanciaTraseraIzqM, directaM: disposicion.distanciaEscuchaIzqM },
    { reflexion: 'trasera', canal: 'der', reflejadaM: disposicion.distanciaTraseraDerM, directaM: disposicion.distanciaEscuchaDerM },
    { reflexion: 'piso', canal: 'izq', reflejadaM: disposicion.distanciaPisoIzqM, directaM: disposicion.distanciaEscuchaIzqM },
    { reflexion: 'piso', canal: 'der', reflejadaM: disposicion.distanciaPisoDerM, directaM: disposicion.distanciaEscuchaDerM },
    { reflexion: 'techo', canal: 'izq', reflejadaM: disposicion.distanciaTechoIzqM, directaM: disposicion.distanciaEscuchaIzqM },
    { reflexion: 'techo', canal: 'der', reflejadaM: disposicion.distanciaTechoDerM, directaM: disposicion.distanciaEscuchaDerM },
  ];
  return entradas.map(({ reflexion, canal, reflejadaM, directaM }) => {
    const deltaM = reflejadaM - directaM;
    // deltaM<=0 es geometría degenerada (parlante ~sobre la superficie de
    // reflexión) — no hay un primer nulo finito que reportar.
    if (deltaM <= 1e-6) {
      return { reflexion, canal, deltaM, primerNuloHz: Infinity, primerRefuerzoHz: Infinity, coeficienteAbsorcion: 0, severidad: 'ok' as const };
    }
    const primerNuloHz = c / (2 * deltaM);
    const primerRefuerzoHz = c / deltaM;
    const bandaIdx = bandaMasCercana(primerNuloHz);
    const coeficienteAbsorcion = coeficienteDeSuperficie(reflexion, canal, materiales, bandaIdx);
    const enRango = primerNuloHz >= FILTRO_PEINE_RANGO_MIN_HZ && primerNuloHz <= FILTRO_PEINE_RANGO_MAX_HZ;
    const reflectante = coeficienteAbsorcion < FILTRO_PEINE_ALPHA_REFLECTANTE_MAX;
    const severidad: 'ok' | 'warn' = enRango && reflectante ? 'warn' : 'ok';
    return { reflexion, canal, deltaM, primerNuloHz, primerRefuerzoHz, coeficienteAbsorcion, severidad };
  });
}

// ---------------------------------------------------------------------
// Asimetría izquierda/derecha (Cambio 4)
// ---------------------------------------------------------------------

export type CategoriaAsimetria = 'directo' | NombreReflexion;

/** 5 cm ≈ 145 µs (a 343 m/s) — criterio del sitio, valor de partida. Por
 * encima de esto la diferencia de tiempo entre canales homólogos empieza a
 * correr la imagen estéreo hacia el parlante más cercano de forma
 * perceptible. */
export const ASIMETRIA_UMBRAL_M = 0.05;

export interface ResultadoAsimetria {
  categoria: CategoriaAsimetria;
  deltaM: number;
  /** `deltaM` convertido a microsegundos (deltaM / 343 m/s × 1e6) — la
   * cifra que explica por qué la imagen se corre hacia un lado. */
  deltaUs: number;
  severidad: 'ok' | 'warn';
}

/**
 * Compara el camino homólogo entre canales, categoría por categoría —
 * incluido el **directo**: con el punto dulce siempre derivado sobre la
 * mediatriz de los parlantes (candado cerrado), las dos distancias
 * directas son iguales por construcción y esta categoría siempre da
 * `deltaM≈0`; con el asiento libre (candado abierto,
 * `calcularDisposicionAsientoManual`) eso deja de ser cierto, y esta
 * misma función ya lo detecta sin necesitar una rama de código aparte.
 */
export function evaluarAsimetria(disposicion: DisposicionSala): ResultadoAsimetria[] {
  const c = VELOCIDAD_SONIDO_MS;
  const entradas: Array<{ categoria: CategoriaAsimetria; izq: number; der: number }> = [
    { categoria: 'directo', izq: disposicion.distanciaEscuchaIzqM, der: disposicion.distanciaEscuchaDerM },
    { categoria: 'frontal', izq: disposicion.distanciaFrontalIzqM, der: disposicion.distanciaFrontalDerM },
    { categoria: 'lateral', izq: disposicion.distanciaLateralIzqM, der: disposicion.distanciaLateralDerM },
    { categoria: 'trasera', izq: disposicion.distanciaTraseraIzqM, der: disposicion.distanciaTraseraDerM },
    { categoria: 'piso', izq: disposicion.distanciaPisoIzqM, der: disposicion.distanciaPisoDerM },
    { categoria: 'techo', izq: disposicion.distanciaTechoIzqM, der: disposicion.distanciaTechoDerM },
  ];
  return entradas.map(({ categoria, izq, der }) => {
    const deltaM = Math.abs(izq - der);
    const deltaUs = (deltaM / c) * 1e6;
    return { categoria, deltaM, deltaUs, severidad: deltaM > ASIMETRIA_UMBRAL_M ? ('warn' as const) : ('ok' as const) };
  });
}

// ---------------------------------------------------------------------
// Ángulo de escucha (triángulo estéreo)
// ---------------------------------------------------------------------

/** Convención estándar de configuración estéreo: triángulo equilátero
 * entre los dos parlantes y el oyente, ángulo de 60°. No es criterio del
 * sitio — es la convención de referencia contra la que se compara
 * `anguloEscuchaGrados` (ver `sala.ts`). */
export const ANGULO_ESCUCHA_CONVENCION_GRADOS = 60;

/** Rango declarado fuera del cual el ángulo entra en `warn` — criterio del
 * sitio, valor de partida. Un ángulo más angosto que `MIN` desperdicia
 * separación de canales (imagen estrecha); más amplio que `MAX` deja un
 * "hueco" central de fase entre los parlantes. Ninguno de los dos es
 * "incorrecto": hay quien prefiere un escenario más angosto a propósito
 * (ver sala.ts, comentario de `anguloEscuchaGrados`) — esta regla sólo
 * avisa fuera del rango, no lo fuerza. */
export const ANGULO_ESCUCHA_MIN_GRADOS = 40;
export const ANGULO_ESCUCHA_MAX_GRADOS = 65;

export type CodigoAnguloEscucha = 'angulo-estrecho' | 'angulo-ok' | 'angulo-amplio';

export interface ResultadoAnguloEscucha {
  anguloGrados: number;
  anguloConvencionGrados: number;
  severidad: 'ok' | 'warn';
  codigo: CodigoAnguloEscucha;
}

export function evaluarAnguloEscucha(disposicion: DisposicionSala): ResultadoAnguloEscucha {
  const angulo = disposicion.anguloEscuchaGrados;
  let codigo: CodigoAnguloEscucha;
  let severidad: 'ok' | 'warn';
  if (angulo < ANGULO_ESCUCHA_MIN_GRADOS) {
    codigo = 'angulo-estrecho';
    severidad = 'warn';
  } else if (angulo > ANGULO_ESCUCHA_MAX_GRADOS) {
    codigo = 'angulo-amplio';
    severidad = 'warn';
  } else {
    codigo = 'angulo-ok';
    severidad = 'ok';
  }
  return { anguloGrados: angulo, anguloConvencionGrados: ANGULO_ESCUCHA_CONVENCION_GRADOS, severidad, codigo };
}
