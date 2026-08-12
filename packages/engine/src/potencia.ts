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

export type CodigoPotencia = 'con-margen' | 'justo' | 'insuficiente';

/** El fabricante recomienda desde `recomendadaW` para este parlante; el
 * amplificador entrega `entregadaW`. El motor no redacta la frase — sólo
 * los números — para no fijar el idioma en el producto; ver CLAUDE.md. */
export interface AvisoPotencia {
  codigo: 'bajo-potencia-recomendada';
  recomendadaW: number;
  entregadaW: number;
}

export interface ResultadoPotencia {
  splDisponibleDb: number;
  margenDb: number;
  severidad: 'ok' | 'warn' | 'alert';
  codigo: CodigoPotencia;
  confianza: Confianza;
  avisos: AvisoPotencia[];
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
  let codigo: CodigoPotencia;
  if (margenDb >= 3) {
    severidad = 'ok';
    codigo = 'con-margen';
  } else if (margenDb >= 0) {
    severidad = 'warn';
    codigo = 'justo';
  } else {
    severidad = 'alert';
    codigo = 'insuficiente';
  }

  const avisos: AvisoPotencia[] = [];
  if (
    parlante.potenciaRecMinW !== null &&
    amplificador.potencia8OhmW.valor < parlante.potenciaRecMinW
  ) {
    avisos.push({
      codigo: 'bajo-potencia-recomendada',
      recomendadaW: parlante.potenciaRecMinW,
      entregadaW: amplificador.potencia8OhmW.valor,
    });
  }

  const confianza = peorConfianza(
    parlante.sensibilidadDb.confianza,
    amplificador.potencia8OhmW.confianza
  );

  return { splDisponibleDb, margenDb, severidad, codigo, confianza, avisos };
}
