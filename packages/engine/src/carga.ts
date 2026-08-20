/**
 * Regla de carga — ¿el amplificador tiene corriente para la caída de
 * impedancia del parlante? Combina dos preguntas distintas, peor-de-las-dos:
 *
 * 1) Reserva de corriente bruta: ¿el amplificador dobla potencia a 4 Ω (o
 *    entrega suficiente potencia bruta) frente a la impedancia MÍNIMA
 *    publicada? Fórmula y veredicto original: docs/motor-mvp.md sección 3.
 * 2) EPDR (equivalent peak dissipation resistance, Otala): la impedancia
 *    mínima sola no captura el estrés real sobre la etapa de salida — un
 *    parlante con la misma |Z| mínima pero con ángulo de fase alto (muy
 *    capacitivo/inductivo en ese punto) exige más corriente de la que la
 *    sola magnitud sugiere. EPDR = |Z| / (1 + |sen θ|): en θ=0° (carga
 *    puramente resistiva) da EPDR=|Z| exacto — no hay estrés extra que
 *    contar; a medida que |θ| crece hacia 90°, EPDR cae hacia |Z|/2,
 *    reflejando una carga más exigente de lo que la magnitud sola muestra.
 *    El catálogo casi nunca publica el ángulo de fase en graves — cuando
 *    falta, se asume un θ=-45° conservador para cualquier parlante de
 *    impedancia NOMINAL ≤4 Ω (criterio de este sitio, declarado como tal,
 *    no una medición). Sin ese dato ni ese umbral nominal, EPDR simplemente
 *    no se calcula (no hay base para asumir nada) y sólo cuenta la reserva
 *    de corriente.
 */

import type { Parlante, Amplificador, Severidad } from './tipos.ts';

/** Umbral de reserva de corriente: cuánto debe subir la potencia de 8 a 4 Ω
 * para contar como "casi la dobla". Declarado como supuesto del modelo. */
export const RATIO_RESERVA = 1.7;

/** Umbral de potencia bruta que por sí sola resuelve una carga dura,
 * incluso sin dato de reserva a 4 Ω. Declarado como supuesto del modelo. */
export const POTENCIA_RESUELVE_W = 60;

/** Ángulo de fase (grados) asumido cuando el catálogo no publica el real,
 * para cualquier parlante de impedancia nominal ≤4 Ω — criterio de este
 * sitio, un valor "moderadamente exigente" conservador, no una medición. */
export const FASE_SUPUESTA_GRADOS = -45;

/** Impedancia nominal a partir de la cual se aplica FASE_SUPUESTA_GRADOS
 * cuando no hay ángulo de fase publicado. */
export const NOMINAL_FASE_SUPUESTA_OHM = 4;

/** Umbrales de EPDR (Ω) — literatura de Otala/Stereophile sobre estrés de
 * corriente en la etapa de salida, no una convención que este sitio
 * invente, aunque los valores exactos de corte quedan declarados acá. */
export const EPDR_ALERT_OHM = 2.0;
export const EPDR_WARN_OHM = 3.0;

export type CodigoCarga = 'sin-dato' | 'exige-corriente' | 'cubierto' | 'carga-benigna' | 'epdr-critico' | 'epdr-ajustado';

export interface ResultadoCarga {
  severidad: Severidad; // 'sin-datos' si impedanciaMinOhm es null; si no, 'ok' | 'warn' | 'alert'
  codigo: CodigoCarga;
  dura: boolean | null; // null cuando severidad es 'sin-datos'
  reserva: boolean | null;
  potente: boolean | null;
  /** EPDR y su ángulo de fase — null cuando no hay ni dato publicado ni
   * fallback aplicable (nominal >4 Ω sin ángulo citado): en ese caso EPDR
   * no participa del veredicto, sólo la reserva de corriente. */
  epdrOhm: number | null;
  thetaGrados: number | null;
  thetaEsSupuesto: boolean;
  // NOTA: el esquema actual (tipos.ts) no lleva confianza en
  // impedanciaMinOhm/anguloFaseGrados — sólo potencia8OhmW/potencia4OhmW la
  // tienen. Por eso este resultado no declara un campo `confianza`:
  // inventar uno mezclando sólo una parte de los datos usados sería más
  // engañoso que no darlo.
}

function peorDeCarga(a: Severidad, b: Severidad): Severidad {
  const orden: Record<Severidad, number> = { ok: 0, warn: 1, alert: 2, 'sin-datos': -1 };
  return orden[b] > orden[a] ? b : a;
}

export function evaluarCarga(parlante: Parlante, amplificador: Amplificador): ResultadoCarga {
  if (parlante.impedanciaMinOhm === null) {
    return {
      severidad: 'sin-datos',
      codigo: 'sin-dato',
      dura: null,
      reserva: null,
      potente: null,
      epdrOhm: null,
      thetaGrados: null,
      thetaEsSupuesto: false,
    };
  }

  const dura = parlante.impedanciaMinOhm <= 4;
  const reserva =
    amplificador.potencia4OhmW !== null &&
    amplificador.potencia4OhmW.valor / amplificador.potencia8OhmW.valor >= RATIO_RESERVA;
  const potente = amplificador.potencia8OhmW.valor >= POTENCIA_RESUELVE_W;
  const resuelta = reserva || potente;

  const severidadBase: 'ok' | 'warn' = dura && !resuelta ? 'warn' : 'ok';
  const codigoBase: CodigoCarga = dura && !resuelta ? 'exige-corriente' : dura ? 'cubierto' : 'carga-benigna';

  let thetaGrados: number | null = parlante.anguloFaseGrados;
  let thetaEsSupuesto = false;
  if (thetaGrados === null && parlante.impedanciaNominalOhm <= NOMINAL_FASE_SUPUESTA_OHM) {
    thetaGrados = FASE_SUPUESTA_GRADOS;
    thetaEsSupuesto = true;
  }

  let epdrOhm: number | null = null;
  let severidadEpdr: Severidad | null = null;
  if (thetaGrados !== null) {
    epdrOhm = parlante.impedanciaMinOhm / (1 + Math.abs(Math.sin((thetaGrados * Math.PI) / 180)));
    severidadEpdr = epdrOhm < EPDR_ALERT_OHM ? 'alert' : epdrOhm < EPDR_WARN_OHM ? 'warn' : 'ok';
  }

  const severidad = severidadEpdr ? peorDeCarga(severidadBase, severidadEpdr) : severidadBase;
  const codigo: CodigoCarga =
    severidadEpdr === 'alert' ? 'epdr-critico' : severidadEpdr === 'warn' && severidadBase === 'ok' ? 'epdr-ajustado' : codigoBase;

  return { severidad, codigo, dura, reserva, potente, epdrOhm, thetaGrados, thetaEsSupuesto };
}
