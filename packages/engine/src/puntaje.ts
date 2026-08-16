/**
 * Puntaje de compatibilidad del match — CAPA CRITERIO-EDITORIAL, no física
 * (ver CLAUDE.md, "Las dos capas"). Combina las severidades ya calculadas
 * por las reglas físicas (potencia, carga, puente, recorrido, modos) en un
 * único número 1-10 mediante pesos que este sitio declara desde su
 * criterio — otro sitio razonable pesaría distinto, y eso está bien: no es
 * un dato medido, es una prioridad editorial. Se rotula como tal en
 * pantalla, nunca mezclado visualmente con un veredicto de capa física.
 *
 * Este módulo no decide QUÉ severidad tiene cada regla — eso ya lo hizo
 * potencia.ts/carga.ts/ganancia.ts/modos.ts. Sólo pondera y combina.
 */
import type { Severidad } from './tipos.ts';

const ORDEN_SEVERIDAD: Record<Exclude<Severidad, 'sin-datos'>, number> = { ok: 0, warn: 1, alert: 2 };

/**
 * La severidad más grave de las dadas — mismo idioma que peorConfianza()
 * en tipos.ts, aplicado a severidad. Combina streamer+dac cuando el
 * usuario eligió los dos: si cualquiera de las dos fuentes tiene un
 * problema de puente/recorrido, el puntaje lo refleja.
 */
export function peorSeveridad(...severidades: Array<Exclude<Severidad, 'sin-datos'>>): Exclude<Severidad, 'sin-datos'> {
  if (severidades.length === 0) {
    throw new Error('peorSeveridad necesita al menos una severidad');
  }
  return severidades.reduce((peor, actual) => (ORDEN_SEVERIDAD[actual] > ORDEN_SEVERIDAD[peor] ? actual : peor));
}

const PUNTOS_POR_SEVERIDAD: Record<Exclude<Severidad, 'sin-datos'>, number> = {
  ok: 10,
  warn: 5,
  alert: 0,
};

/**
 * Pesos declarados por el sitio — criterio editorial, no física. Potencia y
 * carga pesan más porque son riesgos reales (recorte audible, amplificador
 * forzado); puente y recorrido son ajuste fino de ganancia; modos de sala
 * es un hallazgo de la sala, no de la combinación de equipos, pero el sitio
 * eligió incluirlo igual. Suman 1 — ver puntaje.test.ts.
 */
export const PESOS_DECLARADOS = {
  potencia: 0.3,
  carga: 0.25,
  puente: 0.17,
  recorrido: 0.13,
  modos: 0.15,
} as const;

export interface ComponentePuntaje {
  nombre: 'potencia' | 'carga' | 'puente' | 'recorrido' | 'modos';
  peso: number;
  /** null = no aplica a este match (ej. sin streamer ni dac elegido). */
  severidad: Severidad | null;
}

export interface DetallePuntaje {
  nombre: ComponentePuntaje['nombre'];
  incluido: boolean;
  puntos: number | null;
}

/**
 * Umbrales para colorear el número del puntaje — criterio del sitio, no un
 * dato físico (mismo espíritu que PESOS_DECLARADOS): alineados a la escala
 * de puntos por severidad de arriba (ok=10, warn=5, alert=0), así que "todo
 * ok" da verde, "algo warn" da naranjo, "algo alert" tira a rojo.
 */
export const UMBRAL_PUNTAJE_VERDE = 8;
export const UMBRAL_PUNTAJE_NARANJO = 5;

export type ClasePuntaje = 'ok' | 'warn' | 'alert';

export function clasificarPuntaje(puntaje: number): ClasePuntaje {
  if (puntaje >= UMBRAL_PUNTAJE_VERDE) return 'ok';
  if (puntaje >= UMBRAL_PUNTAJE_NARANJO) return 'warn';
  return 'alert';
}

export interface ResultadoPuntaje {
  puntaje: number; // 1-10, redondeado — nunca 0: ver puntaje.test.ts
  clase: ClasePuntaje;
  componentesEvaluados: number;
  componentesTotales: number;
  detalle: DetallePuntaje[];
}

/**
 * "sin-datos" se excluye igual que null: un dato faltante no cuenta como
 * "ok" (rompería la doctrina del proyecto) ni penaliza como si fuera un
 * problema real del equipo — simplemente no vota. `componentesEvaluados`
 * declara cuántos sí pudieron votar, para que el número nunca se lea como
 * más completo de lo que es.
 */
export function calcularPuntaje(componentes: ComponentePuntaje[]): ResultadoPuntaje {
  let sumaPonderada = 0;
  let sumaPesos = 0;
  const detalle: DetallePuntaje[] = [];

  for (const c of componentes) {
    if (c.severidad === null || c.severidad === 'sin-datos') {
      detalle.push({ nombre: c.nombre, incluido: false, puntos: null });
      continue;
    }
    const puntos = PUNTOS_POR_SEVERIDAD[c.severidad];
    sumaPonderada += c.peso * puntos;
    sumaPesos += c.peso;
    detalle.push({ nombre: c.nombre, incluido: true, puntos });
  }

  const promedio = sumaPesos > 0 ? sumaPonderada / sumaPesos : 0;
  const puntaje = Math.max(1, Math.round(promedio));

  return {
    puntaje,
    clase: clasificarPuntaje(puntaje),
    componentesEvaluados: detalle.filter((d) => d.incluido).length,
    componentesTotales: componentes.length,
    detalle,
  };
}
