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
