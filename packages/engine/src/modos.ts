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
 * ser de resonancias individuales. Sólo se listan modos hasta acá. */
export const TECHO_MODOS_HZ = 300;

/**
 * Techo más estricto para la detección de agrupamiento — criterio del sitio,
 * no una convención publicada. Por encima de ~150 Hz la densidad modal sube
 * y que dos modos caigan cerca por pura densidad deja de ser un indicio de
 * mala proporción de sala; restringir el chequeo a la región grave evita
 * falsos positivos.
 */
export const TECHO_AGRUPAMIENTO_HZ = 150;

/** Diferencia relativa bajo la cual dos modos de ejes distintos se consideran
 * "agrupados" (refuerzo audible de graves) — criterio del sitio, se verifica
 * midiendo/escuchando, igual salvedad que el resto de las reglas de sala. */
export const UMBRAL_AGRUPAMIENTO = 0.05;

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

function modosDeEje(eje: EjeSala, longitudM: number): ModoAxial[] {
  const modos: ModoAxial[] = [];
  for (let orden = 1; ; orden++) {
    const frecuenciaHz = frecuenciaModoAxialHz(longitudM, orden);
    if (frecuenciaHz > TECHO_MODOS_HZ) break;
    modos.push({ eje, orden, frecuenciaHz });
  }
  return modos;
}

export function evaluarModos(sala: Sala): ResultadoModos {
  const modos = [
    ...modosDeEje('ancho', sala.anchoM),
    ...modosDeEje('largo', sala.largoM),
    ...modosDeEje('alto', sala.altoM),
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

  const codigo: CodigoModos = agrupados.length > 0 ? 'modos-agrupados' : 'modos-distribuidos';
  return { modos, agrupados, severidad: agrupados.length > 0 ? 'warn' : 'ok', codigo };
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
