/**
 * Ganancia de cadena / puente de impedancias fuente→amplificador — regla
 * opcional: sólo corre si el usuario agrega una fuente (streamer o DAC) a la
 * cadena. No reemplaza ni condiciona potencia.ts/carga.ts, que siguen
 * funcionando igual con o sin fuente declarada. Dos preguntas físicamente
 * distintas, dos funciones. Fórmulas, constantes y veredictos:
 * docs/motor-mvp.md sección 6.
 */

import type { Amplificador, Fuente, Severidad } from './tipos.ts';

/** Convención estándar de "voltage bridging" en audio profesional (Rane
 * "Sound System Interconnection"; Bill Whitlock / Jensen Transformers): la
 * entrada debe tener al menos 10× la impedancia de salida de la fuente para
 * que la pérdida de nivel sea despreciable (<1 dB). Declarado como supuesto
 * del modelo, no dato del equipo. */
export const RATIO_BRIDGING_OK = 10;

/** A cuántas veces de sobra el recorrido del volumen se considera "corto":
 * no hay un número citable equivalente a RATIO_BRIDGING_OK para esto (ver
 * motor-mvp.md sección 6.2) — es una decisión de producto, fijada tras
 * preguntar en vez de inventarla. */
export const UMBRAL_RECORRIDO = 10;

export type CodigoPuenteImpedancias = 'sin-dato' | 'puente-correcto' | 'puente-ajustado' | 'puente-insuficiente';

export interface ResultadoPuenteImpedancias {
  severidad: Severidad; // 'sin-datos' si falta algún dato de impedancia; si no, 'ok' | 'warn' | 'alert'
  codigo: CodigoPuenteImpedancias;
  ratioZ: number | null; // null cuando severidad es 'sin-datos'
  // NOTA: igual que carga.ts, el esquema actual no lleva confianza por campo
  // en Amplificador.impedanciaEntradaOhm — sólo Fuente tiene un único
  // confianza para todo el registro. Mezclar ese confianza con "la mitad
  // que falta" del lado del ampli sería más engañoso que no declarar el
  // campo, así que este resultado no incluye `confianza`.
}

export function evaluarPuenteImpedancias(
  fuente: Fuente,
  amplificador: Amplificador
): ResultadoPuenteImpedancias {
  if (fuente.impedanciaSalidaOhm === null || amplificador.impedanciaEntradaOhm === null) {
    return { severidad: 'sin-datos', codigo: 'sin-dato', ratioZ: null };
  }

  const ratioZ = amplificador.impedanciaEntradaOhm / fuente.impedanciaSalidaOhm;

  if (ratioZ >= RATIO_BRIDGING_OK) {
    return { severidad: 'ok', codigo: 'puente-correcto', ratioZ };
  }
  if (ratioZ >= 1) {
    return { severidad: 'warn', codigo: 'puente-ajustado', ratioZ };
  }
  return { severidad: 'alert', codigo: 'puente-insuficiente', ratioZ };
}

export type CodigoRecorridoVolumen = 'sin-dato' | 'insuficiente' | 'recorrido-sano' | 'recorrido-corto';

export interface ResultadoRecorridoVolumen {
  severidad: Severidad; // 'sin-datos' si falta algún dato de tensión; si no, 'ok' | 'warn' | 'alert'
  codigo: CodigoRecorridoVolumen;
  margenV: number | null; // null cuando severidad es 'sin-datos'
  // Mismo motivo que ResultadoPuenteImpedancias: sin `confianza` declarado.
}

export function evaluarRecorridoVolumen(
  fuente: Fuente,
  amplificador: Amplificador
): ResultadoRecorridoVolumen {
  if (fuente.salidaV === null || amplificador.sensEntradaMv === null) {
    return { severidad: 'sin-datos', codigo: 'sin-dato', margenV: null };
  }

  const margenV = fuente.salidaV / (amplificador.sensEntradaMv / 1000);

  if (margenV < 1) {
    return { severidad: 'alert', codigo: 'insuficiente', margenV };
  }
  if (margenV <= UMBRAL_RECORRIDO) {
    return { severidad: 'ok', codigo: 'recorrido-sano', margenV };
  }
  return { severidad: 'warn', codigo: 'recorrido-corto', margenV };
}
