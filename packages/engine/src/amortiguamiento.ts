/**
 * Interacción de amortiguamiento — la impedancia de salida del
 * amplificador (derivada del factor de amortiguamiento publicado) forma un
 * divisor de tensión con la curva de impedancia del parlante: en el pico de
 * resonancia de graves (Z_max), donde la impedancia es más alta, ese
 * divisor deja pasar relativamente MÁS tensión que en el mínimo (Z_min) —
 * una coloración tonal real, no un "factor de amortiguamiento bajo es
 * malo" genérico (que penalizaría sin motivo a electrónica valvular/de
 * salida alta, que puede sonar perfectamente bien con el parlante
 * correcto: lo que importa es la INTERACCIÓN con la curva de ESE parlante,
 * no el número de DF aislado).
 *
 * Z_out = 8 / DF (el factor de amortiguamiento se publica referido a 8 Ω).
 * ΔdB = 20·log10( Zmax·(Zmin+Zout) / (Zmin·(Zmax+Zout)) ) — la diferencia
 * de atenuación del divisor de tensión entre el pico y el mínimo de
 * impedancia. Ninguno de los dos campos que esto necesita
 * (factorAmortiguamiento del ampli, impedanciaMaxOhm del parlante) está
 * poblado todavía en el catálogo — la regla ya está lista, se activa sola
 * cuando una ronda de catálogo futura cargue esos datos.
 */
import type { Parlante, Amplificador, Severidad } from './tipos.ts';

/** Impedancia de pico de resonancia asumida cuando el parlante no publica
 * `impedanciaMaxOhm` — valor típico de referencia para un puerto/resonancia
 * de graves modesta, criterio de este sitio, no una medición del parlante
 * real. Declarado explícitamente en el resultado (`zMaxEsSupuesto`) para
 * que la UI nunca lo muestre como si fuera un dato citado. */
export const ZMAX_SUPUESTO_OHM = 25;

export const DELTA_DB_OPTIMO_MAX = 0.3;
export const DELTA_DB_WARN_MAX = 1.5;

export type CodigoAmortiguamiento = 'sin-dato' | 'optimo' | 'con-reparos' | 'critico';

export interface ResultadoAmortiguamiento {
  severidad: Severidad; // 'sin-datos' si falta factorAmortiguamiento o impedanciaMinOhm; si no, 'ok'|'warn'|'alert'
  codigo: CodigoAmortiguamiento;
  zOutOhm: number | null;
  zMinOhm: number | null;
  zMaxOhm: number | null;
  zMaxEsSupuesto: boolean; // true ⇒ zMaxOhm es ZMAX_SUPUESTO_OHM, no un dato del parlante
  deltaDb: number | null;
}

export function evaluarAmortiguamiento(parlante: Parlante, amplificador: Amplificador): ResultadoAmortiguamiento {
  if (amplificador.factorAmortiguamiento === null || parlante.impedanciaMinOhm === null) {
    return { severidad: 'sin-datos', codigo: 'sin-dato', zOutOhm: null, zMinOhm: null, zMaxOhm: null, zMaxEsSupuesto: false, deltaDb: null };
  }

  const zOutOhm = 8 / amplificador.factorAmortiguamiento;
  const zMaxEsSupuesto = parlante.impedanciaMaxOhm === null;
  const zMaxOhm = parlante.impedanciaMaxOhm ?? ZMAX_SUPUESTO_OHM;
  const zMinOhm = parlante.impedanciaMinOhm;

  const deltaDb = 20 * Math.log10((zMaxOhm * (zMinOhm + zOutOhm)) / (zMinOhm * (zMaxOhm + zOutOhm)));

  let severidad: Exclude<Severidad, 'sin-datos'>;
  let codigo: CodigoAmortiguamiento;
  if (deltaDb <= DELTA_DB_OPTIMO_MAX) {
    severidad = 'ok';
    codigo = 'optimo';
  } else if (deltaDb <= DELTA_DB_WARN_MAX) {
    severidad = 'warn';
    codigo = 'con-reparos';
  } else {
    severidad = 'alert';
    codigo = 'critico';
  }

  return { severidad, codigo, zOutOhm, zMinOhm, zMaxOhm, zMaxEsSupuesto, deltaDb };
}
