/**
 * Esquema de dominio — fuente de verdad. Espeja exactamente la forma de los
 * datos en data/equipos-seed.json y lo documentado en docs/motor-mvp.md
 * sección 1. Ningún equipo hardcodeado acá: sólo formas de datos.
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
