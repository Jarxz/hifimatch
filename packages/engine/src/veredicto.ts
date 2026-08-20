/**
 * Veredicto consolidado del resultado — CAPA CRITERIO-EDITORIAL, no física
 * (mismo principio que puntaje.ts, ver CLAUDE.md "Las dos capas"). Agrupa
 * las severidades ya calculadas por las reglas físicas en 3 estados
 * ("Potencia", "Acople eléctrico", "Sala") en vez de un único número 1-10:
 * un compuesto ponderado disuelve un problema grave entre varias cosas que
 * están bien (un amplificador que no alcanza en picos puede terminar
 * pareciendo aceptable si el resto promedia bien) — acá gana el peor
 * eslabón de cada grupo, no un promedio. `puntaje.ts` (el 1-10) no se
 * toca: sigue existiendo tal cual para un futuro comparador entre
 * análisis, donde un número relativo sí tiene función (ordenar A contra
 * B). Este módulo es sólo para el resultado individual.
 *
 * Reusa `peorSeveridad()` de puntaje.ts — ya estaba exportada
 * explícitamente "por si sirve para otra combinación futura".
 *
 * Como en el resto del motor: dato faltante nunca es "malo" — "sin-datos"
 * se excluye del cálculo del grupo, nunca cuenta como reparo. Si un grupo
 * entero queda sin ningún componente con dato, el grupo mismo es
 * "sin-datos" (no se inventa un color), y no participa del veredicto
 * general — mismo criterio que ya aplica calcularPuntaje().
 */
import type { Severidad } from './tipos.ts';
import { peorSeveridad } from './puntaje.ts';

export type EstadoGrupo = Exclude<Severidad, 'sin-datos'> | 'sin-datos';

export interface EntradaVeredicto {
  potencia: Exclude<Severidad, 'sin-datos'>; // potencia siempre tiene valor (nunca sin-datos)
  carga: Severidad;
  amortiguamiento: Severidad; // interacción DF↔curva de impedancia — ver amortiguamiento.ts
  puenteStreamer: Severidad | null; // null = streamer no elegido
  recorridoStreamer: Severidad | null;
  puenteDac: Severidad | null; // null = dac no elegido
  recorridoDac: Severidad | null;
  modos: 'ok' | 'warn'; // techo de severidad de sala — nunca 'alert' (ver CLAUDE.md)
  reverberacion: 'ok' | 'warn'; // ídem
}

export interface ResultadoVeredicto {
  potencia: Exclude<Severidad, 'sin-datos'>;
  acopleElectrico: EstadoGrupo;
  sala: 'ok' | 'warn';
  /** Peor de los grupos que sí tienen dato — potencia y sala siempre lo
   * tienen (ninguno de los dos puede ser "sin-datos"), así que `general`
   * nunca es "sin-datos": siempre hay al menos un piso físico real sobre
   * el que apoyar el veredicto. */
  general: Exclude<Severidad, 'sin-datos'>;
}

function sinFaltantes(...valores: Array<Severidad | null>): Array<Exclude<Severidad, 'sin-datos'>> {
  return valores.filter((v): v is Exclude<Severidad, 'sin-datos'> => v !== null && v !== 'sin-datos');
}

export function calcularVeredicto(e: EntradaVeredicto): ResultadoVeredicto {
  const valoresAcople = sinFaltantes(e.carga, e.amortiguamiento, e.puenteStreamer, e.recorridoStreamer, e.puenteDac, e.recorridoDac);
  const acopleElectrico: EstadoGrupo = valoresAcople.length > 0 ? peorSeveridad(...valoresAcople) : 'sin-datos';
  const sala = peorSeveridad(e.modos, e.reverberacion) as 'ok' | 'warn';
  const grupos = acopleElectrico === 'sin-datos' ? [e.potencia, sala] : [e.potencia, acopleElectrico, sala];
  const general = peorSeveridad(...grupos);
  return { potencia: e.potencia, acopleElectrico, sala, general };
}
