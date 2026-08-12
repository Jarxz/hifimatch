/**
 * Regla de potencia — ¿el amplificador entrega el SPL de pico que la sala pide?
 * Fórmula, constantes y veredicto: docs/motor-mvp.md sección 2.
 */

import { atenuacionPorDistanciaDb, gananciaPorPotenciaDb } from './unidades.ts';
import { peorConfianza } from './tipos.ts';
import type { Parlante, Amplificador, Confianza } from './tipos.ts';

export type NivelEscucha = 'moderado' | 'alto' | 'referencia';

/** SPL de pico objetivo en el punto de escucha, por nivel. */
export const PICO_OBJETIVO_DB: Record<NivelEscucha, number> = {
  moderado: 90,
  alto: 100,
  referencia: 105,
};

/** Constantes del modelo — supuestos declarados, no datos del equipo.
 * Se verifican midiendo; ver motor-mvp.md sección 2. */
export const SUMA_PAR_DB = 6;
export const GANANCIA_SALA_DB = 3;

export interface ResultadoPotencia {
  splDisponibleDb: number;
  margenDb: number;
  severidad: 'ok' | 'warn' | 'alert';
  etiqueta: string;
  confianza: Confianza;
  avisos: string[];
}

export function evaluarPotencia(
  parlante: Parlante,
  amplificador: Amplificador,
  distanciaM: number,
  nivel: NivelEscucha
): ResultadoPotencia {
  const splDisponibleDb =
    parlante.sensibilidadDb.valor -
    atenuacionPorDistanciaDb(distanciaM) +
    gananciaPorPotenciaDb(amplificador.potencia8OhmW.valor) +
    SUMA_PAR_DB +
    GANANCIA_SALA_DB;

  const margenDb = splDisponibleDb - PICO_OBJETIVO_DB[nivel];

  let severidad: ResultadoPotencia['severidad'];
  let etiqueta: string;
  if (margenDb >= 3) {
    severidad = 'ok';
    etiqueta = 'Con margen';
  } else if (margenDb >= 0) {
    severidad = 'warn';
    etiqueta = 'Justo';
  } else {
    severidad = 'alert';
    etiqueta = 'Insuficiente';
  }

  const avisos: string[] = [];
  if (
    parlante.potenciaRecMinW !== null &&
    amplificador.potencia8OhmW.valor < parlante.potenciaRecMinW
  ) {
    avisos.push(
      `El fabricante recomienda desde ${parlante.potenciaRecMinW} W para este parlante; ` +
        `el amplificador entrega ${amplificador.potencia8OhmW.valor} W.`
    );
  }

  const confianza = peorConfianza(
    parlante.sensibilidadDb.confianza,
    amplificador.potencia8OhmW.confianza
  );

  return { splDisponibleDb, margenDb, severidad, etiqueta, confianza, avisos };
}
