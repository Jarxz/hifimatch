/**
 * Modos axiales de sala — resonancias de graves desde una sala rígida y
 * rectangular, igual modelo y misma salvedad que sala.ts (CLAUDE.md, sección
 * "Severidad y bloque de sala": ninguna regla de sala emite `error`, techo
 * `warn`, siempre con la nota de que se verifica midiendo).
 *
 * Sólo se calculan modos axiales (una sola dimensión) — son los más fuertes
 * porque no pierden energía en reflexiones múltiples; tangenciales y
 * oblicuos quedan fuera del alcance de este modelo simplificado.
 */
import { frecuenciaModoAxialHz } from './unidades.ts';
import type { Sala } from './sala.ts';

/** Techo de la región de modos de sala — convención estándar de acústica de
 * salas domésticas (ej. Everest & Pohlmann, "Master Handbook of Acoustics"):
 * por encima de esto la densidad modal es alta y el comportamiento deja de
 * ser de resonancias individuales. Sólo se listan modos hasta acá por
 * defecto — ver el parámetro `techoModosHz` de `evaluarModos()` para cuando
 * se reemplaza por un valor derivado de la sala real. */
export const TECHO_MODOS_HZ = 300;

/**
 * Clamp para el techo de modos cuando se deriva de la frecuencia de
 * Schroeder de la sala real (`techoModosDesdeSchroeder()`) — evita que una
 * sala muy chica/absorbente (fs muy baja) o muy grande/reflectante (fs muy
 * alta) produzca un techo de modos absurdo. Criterio del sitio, no una
 * convención publicada.
 */
export const CLAMP_TECHO_MODOS_MIN_HZ = 150;
export const CLAMP_TECHO_MODOS_MAX_HZ = 400;

/**
 * Techo más estricto para la detección de agrupamiento — criterio del sitio,
 * no una convención publicada. Por encima de ~150 Hz la densidad modal sube
 * y que dos modos caigan cerca por pura densidad deja de ser un indicio de
 * mala proporción de sala; restringir el chequeo a la región grave evita
 * falsos positivos. Fijo — a diferencia del techo de LISTADO de modos
 * (`techoModosHz`), no se deriva de la sala real.
 */
export const TECHO_AGRUPAMIENTO_HZ = 150;

/**
 * Diferencia relativa bajo la cual dos modos de ejes distintos entran en el
 * conjunto de "candidatos a agrupados" (refuerzo audible de graves) —
 * criterio del sitio, se verifica midiendo/escuchando. Un barrido externo
 * de 17.784 salas plausibles mostró que el umbral anterior (5%) marcaba el
 * 86% de las salas — un semáforo que casi siempre dice lo mismo no
 * discrimina nada. 2% + la regla de dos condiciones de abajo cubre el 37%
 * del mismo barrido.
 */
export const UMBRAL_AGRUPAMIENTO = 0.02;

/**
 * Umbral, más estricto que `UMBRAL_AGRUPAMIENTO`, bajo el cual UN SOLO par
 * ya alcanza para "warn" — un solapamiento casi exacto (ej. 0,00% de
 * diferencia, dos modos en la misma frecuencia) es el peor caso posible,
 * y exigir un segundo par para marcarlo (ver `MIN_PARES_AGRUPADOS`) lo
 * dejaría pasar como una sala "buena". Criterio del sitio.
 */
export const UMBRAL_AGRUPAMIENTO_EXACTO = 0.01;

/** Con un solo par por debajo de `UMBRAL_AGRUPAMIENTO` (pero no tan cerca
 * como para cruzar `UMBRAL_AGRUPAMIENTO_EXACTO`), no alcanza para "warn" —
 * recién dos o más pares en esa banda son indicio de una sala mal
 * proporcionada en varios órdenes a la vez. Criterio del sitio. */
export const MIN_PARES_AGRUPADOS = 2;

/** Cuántos agrupamientos curar (curvas 1D, mapa de zonas) — los de menor
 * frecuencia, que son los más audibles y los más difíciles de tratar
 * acústicamente. El resto de los agrupamientos sigue contando en el texto
 * de la tarjeta (el "N par(es)..."), sólo no se grafican, para no saturar
 * de curvas/celdas. Vivía como constante privada en curvamodal.ts; se
 * promovió acá junto con `paresMasImportantes` para que un segundo
 * consumidor (el mapa de zonas modales) nunca pueda curar un conjunto de
 * pares distinto al de las curvas — una sola función, no una convención
 * repetida a mano en cada archivo. */
export const TOP_N_AGRUPADOS = 2;

export type EjeSala = 'ancho' | 'largo' | 'alto';

export interface ModoAxial {
  eje: EjeSala;
  orden: number; // n = 1, 2, 3…
  frecuenciaHz: number;
}

export interface ModoAgrupado {
  modoA: ModoAxial;
  modoB: ModoAxial;
  diferenciaHz: number;
}

export type CodigoModos = 'modos-distribuidos' | 'modos-agrupados';

export interface ResultadoModos {
  modos: ModoAxial[];
  agrupados: ModoAgrupado[];
  severidad: 'ok' | 'warn';
  codigo: CodigoModos;
}

function modosDeEje(eje: EjeSala, longitudM: number, techoHz: number): ModoAxial[] {
  const modos: ModoAxial[] = [];
  for (let orden = 1; ; orden++) {
    const frecuenciaHz = frecuenciaModoAxialHz(longitudM, orden);
    if (frecuenciaHz > techoHz) break;
    modos.push({ eje, orden, frecuenciaHz });
  }
  return modos;
}

/**
 * `techoModosHz` (por defecto `TECHO_MODOS_HZ`) fija hasta dónde se LISTAN
 * modos — no afecta la detección de agrupamiento, que siempre usa el techo
 * fijo `TECHO_AGRUPAMIENTO_HZ` (150 Hz). Quien llama puede pasar en cambio
 * la frecuencia de Schroeder de la sala real (ver
 * `techoModosDesdeSchroeder()`, reverberacion.ts la calcula): con el techo
 * fijo de 300 Hz, la región donde "Modos de sala" afirma cubrir todo el
 * comportamiento resonante podía terminar por debajo de donde
 * "Reverberación" empezaba a ser válida (fs de la sala por defecto: 371,6
 * Hz bajo el modelo viejo) — un hueco que ninguna de las dos reglas
 * gobernaba. Pasando la fs real como techo, las dos regiones quedan
 * contiguas por construcción.
 */
export function evaluarModos(sala: Sala, techoModosHz: number = TECHO_MODOS_HZ): ResultadoModos {
  const modos = [
    ...modosDeEje('ancho', sala.anchoM, techoModosHz),
    ...modosDeEje('largo', sala.largoM, techoModosHz),
    ...modosDeEje('alto', sala.altoM, techoModosHz),
  ].sort((a, b) => a.frecuenciaHz - b.frecuenciaHz);

  const candidatos = modos.filter((m) => m.frecuenciaHz <= TECHO_AGRUPAMIENTO_HZ);

  const agrupados: ModoAgrupado[] = [];
  for (let i = 0; i < candidatos.length; i++) {
    for (let j = i + 1; j < candidatos.length; j++) {
      const modoA = candidatos[i]!;
      const modoB = candidatos[j]!;
      if (modoA.eje === modoB.eje) continue; // mismo eje: armónico, no coincidencia
      const diferenciaHz = Math.abs(modoB.frecuenciaHz - modoA.frecuenciaHz);
      const promedioHz = (modoA.frecuenciaHz + modoB.frecuenciaHz) / 2;
      if (diferenciaHz / promedioHz < UMBRAL_AGRUPAMIENTO) {
        agrupados.push({ modoA, modoB, diferenciaHz });
      }
    }
  }

  // "warn" si hay al menos un par casi exacto (< UMBRAL_AGRUPAMIENTO_EXACTO)
  // O si hay dos o más pares por debajo de UMBRAL_AGRUPAMIENTO — un único
  // par "flojo" (cerca de 2% pero lejos de 1%) no alcanza solo. Ver
  // comentario de las constantes.
  const hayParExacto = agrupados.some((a) => a.diferenciaHz / promedioHz(a) < UMBRAL_AGRUPAMIENTO_EXACTO);
  const hayVariosCercanos = agrupados.length >= MIN_PARES_AGRUPADOS;
  const severidad: 'ok' | 'warn' = hayParExacto || hayVariosCercanos ? 'warn' : 'ok';
  const codigo: CodigoModos = severidad === 'warn' ? 'modos-agrupados' : 'modos-distribuidos';
  return { modos, agrupados, severidad, codigo };
}

/** Clamp declarado (`CLAMP_TECHO_MODOS_MIN_HZ`/`MAX_HZ`) sobre la
 * frecuencia de Schroeder de la sala, para usarla como techo dinámico de
 * `evaluarModos()` — ver el comentario de esa función. `null` cuando
 * `reverberacion.ts` no pudo calcular una fs (sala fuera del dominio de
 * Sabine/Eyring, ver `ALPHA_CAMPO_DIFUSO_MAX`) — cae al techo por defecto
 * declarado (`TECHO_MODOS_HZ`) en vez de inventar un número. */
export function techoModosDesdeSchroeder(frecuenciaSchroederHz: number | null): number {
  if (frecuenciaSchroederHz === null) return TECHO_MODOS_HZ;
  return Math.min(CLAMP_TECHO_MODOS_MAX_HZ, Math.max(CLAMP_TECHO_MODOS_MIN_HZ, frecuenciaSchroederHz));
}

/** Ordena por frecuencia promedio del par (ascendente) y corta a los
 * `TOP_N_AGRUPADOS` más graves — la curación que ya usan las curvas 1D de
 * `curvamodal.ts`, exportada para que el mapa de zonas modales (2D) la
 * reuse en vez de reimplementarla: las dos visualizaciones muestran
 * siempre exactamente los mismos pares, por construcción. */
export function paresMasImportantes(agrupados: ModoAgrupado[]): ModoAgrupado[] {
  return [...agrupados]
    .sort((a, b) => promedioHz(a) - promedioHz(b))
    .slice(0, TOP_N_AGRUPADOS);
}

function promedioHz(par: ModoAgrupado): number {
  return (par.modoA.frecuenciaHz + par.modoB.frecuenciaHz) / 2;
}

/**
 * Cruce geometría↔modo: ¿el punto de escucha calculado cae en el nulo de
 * presión del primer modo axial de largo? Para una sala rígida, el modo
 * axial n=1 a lo largo de un eje tiene forma de onda estacionaria
 * cos(π·y/L): antinodos (presión máxima) en los dos muros (y=0, y=L) y un
 * único nodo (presión mínima, "nulo") exactamente en el centro, y=L/2 —
 * ahí ese modo en particular se cancela casi por completo, sea cual sea su
 * amplitud real en la sala (que este modelo no mide). Es geometría de sala
 * rígida, la misma salvedad que el resto de sala.ts/modos.ts.
 *
 * Ventana de ±10% de L alrededor del punto medio — criterio de este sitio
 * (no una convención publicada), dado explícitamente para esta regla.
 */
export const VENTANA_NULO_MODAL = 0.1;

export type CodigoNuloEscucha = 'nulo-lejos' | 'nulo-cerca';

export interface ResultadoNuloEscucha {
  frecuenciaHz: number; // f1 del modo axial de largo (orden 1)
  puntoMedioM: number; // L/2 — el nulo exacto
  distanciaAlMedioM: number;
  ventanaM: number; // L · VENTANA_NULO_MODAL
  /** Techo `warn`, nunca `alert`/`error` — igual que el resto de las reglas
   * de sala (CLAUDE.md, "Severidad y bloque de sala"): esto predice desde
   * una sala rígida y se verifica escuchando, no calculando. */
  severidad: 'ok' | 'warn';
  codigo: CodigoNuloEscucha;
}

/** `escuchaYM` es la coordenada de profundidad (eje "largo") del punto de
 * escucha calculado por sala.ts (`DisposicionSala.puntoDulce.y`) — depende
 * de la disposición de parlantes, así que a diferencia de `evaluarModos()`
 * (que sólo mira dimensiones) esto hay que recalcularlo cada vez que la
 * disposición cambia (arrastre + Recalcular). */
export function evaluarNuloEscucha(sala: Sala, escuchaYM: number): ResultadoNuloEscucha {
  const frecuenciaHz = frecuenciaModoAxialHz(sala.largoM, 1);
  const puntoMedioM = sala.largoM / 2;
  const distanciaAlMedioM = Math.abs(escuchaYM - puntoMedioM);
  const ventanaM = sala.largoM * VENTANA_NULO_MODAL;
  const dentro = distanciaAlMedioM <= ventanaM;
  return {
    frecuenciaHz,
    puntoMedioM,
    distanciaAlMedioM,
    ventanaM,
    severidad: dentro ? 'warn' : 'ok',
    codigo: dentro ? 'nulo-cerca' : 'nulo-lejos',
  };
}
