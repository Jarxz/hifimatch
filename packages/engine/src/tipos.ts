/**
 * Esquema de dominio — fuente de verdad. Espeja exactamente la forma de los
 * datos en packages/data/src/catalogo.ts y lo documentado en
 * docs/motor-mvp.md sección 1. Ningún equipo hardcodeado acá: sólo formas
 * de datos.
 */

export type Confianza = 'alta' | 'media' | 'baja';

export interface DatoConFuente<T> {
  valor: T;
  fuente: string;
  confianza: Confianza;
  nota?: string;
}

export interface Parlante {
  id: string;
  nombre: string;
  tipo: string;
  sensibilidadDb: DatoConFuente<number>; // unidad: dB/2.83V·m
  impedanciaNominalOhm: number;
  impedanciaMinOhm: number | null; // null ⇒ la regla de carga da "sin-datos"
  potenciaRecMinW: number | null;
  potenciaRecMaxW: number | null;
  /** Ángulo de fase (grados) en el punto más exigente de graves — casi
   * nunca publicado; ver carga.ts (EPDR) para el criterio de reemplazo
   * cuando falta. null ⇒ no hay dato citado todavía. */
  anguloFaseGrados: number | null;
  /** Impedancia máxima (pico de resonancia de graves) — casi nunca
   * publicada; ver amortiguamiento.ts. null ⇒ no hay dato citado todavía. */
  impedanciaMaxOhm: number | null;
}

export interface Amplificador {
  id: string;
  nombre: string;
  tipo: string;
  potencia8OhmW: DatoConFuente<number>;
  potencia4OhmW: DatoConFuente<number> | null;
  cargaMinOhm: number | null;
  sensEntradaMv: number | null;
  impedanciaEntradaOhm: number | null;
  /** Factor de amortiguamiento publicado (referido a 8 Ω) — casi nunca
   * publicado fuera de la ficha técnica de fábrica; ver
   * amortiguamiento.ts. null ⇒ no hay dato citado todavía. */
  factorAmortiguamiento: number | null;
}

/**
 * Fuente digital (streamer o DAC) — usada sólo por la regla de ganancia de
 * cadena (ganancia.ts, motor-mvp.md sección 6). Opcional: no entra a
 * potencia.ts ni carga.ts. A diferencia de Parlante/Amplificador, fuente y
 * confianza son un solo par para todo el registro, no por campo — así está
 * curado en packages/data/src/catalogo.ts (categoría `fuentes`).
 */
export interface Fuente {
  id: string;
  nombre: string;
  tipo: string;
  salidaV: number | null; // tensión de salida analógica, RMS
  impedanciaSalidaOhm: number | null;
  fuente: string;
  confianza: Confianza;
}

export type Severidad = 'ok' | 'warn' | 'alert' | 'sin-datos';

const ORDEN_CONFIANZA: Record<Confianza, number> = { alta: 2, media: 1, baja: 0 };

/** La confianza más baja de las dadas — "el veredicto hereda la peor confianza
 * de los datos que usó" (motor-mvp.md, regla de potencia y de carga). */
export function peorConfianza(...confianzas: Confianza[]): Confianza {
  if (confianzas.length === 0) {
    throw new Error('peorConfianza necesita al menos una confianza');
  }
  return confianzas.reduce((peor, actual) =>
    ORDEN_CONFIANZA[actual] < ORDEN_CONFIANZA[peor] ? actual : peor
  );
}

const ORDEN_SEVERIDAD: Record<Exclude<Severidad, 'sin-datos'>, number> = { ok: 0, warn: 1, alert: 2 };

/** La severidad más grave de las dadas — mismo idioma que peorConfianza(),
 * aplicado a severidad. Usada por veredicto.ts para agrupar el peor
 * componente de cada estado (Potencia / Acople eléctrico / Sala). */
export function peorSeveridad(...severidades: Array<Exclude<Severidad, 'sin-datos'>>): Exclude<Severidad, 'sin-datos'> {
  if (severidades.length === 0) {
    throw new Error('peorSeveridad necesita al menos una severidad');
  }
  return severidades.reduce((peor, actual) => (ORDEN_SEVERIDAD[actual] > ORDEN_SEVERIDAD[peor] ? actual : peor));
}
