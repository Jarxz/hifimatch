/**
 * Conversiones de unidad puras — sin estado, sin I/O, sin dependencias.
 * Cada función corresponde a un término de las fórmulas de docs/motor-mvp.md.
 * Vectores de prueba en unidades.test.ts, tomados de la aritmética intermedia
 * ya verificada en motor-mvp.md sección 2 (vectores A/B/C de potencia).
 */

/** Atenuación por distancia, en dB. Término "− 20·log₁₀(distanciaM)" de la fórmula de potencia. */
export function atenuacionPorDistanciaDb(distanciaM: number): number {
  return 20 * Math.log10(distanciaM);
}

/** Ganancia por potencia del amplificador, en dB, referida a 1 W. Término "+ 10·log₁₀(potenciaW)". */
export function gananciaPorPotenciaDb(potenciaW: number): number {
  return 10 * Math.log10(potenciaW);
}

/**
 * Suma de niveles en dB en el dominio de potencia (incoherente): 10·log₁₀(Σ 10^(Lᵢ/10)).
 * Distinto del supuesto SUMA_PAR=6dB de potencia.ts, que es una constante de modelo
 * declarada para un par coherente (correlacionado) en el punto de escucha — no el
 * resultado de esta función. No confundir ambos.
 */
export function sumarNivelesDb(nivelesDb: number[]): number {
  const sumaLineal = nivelesDb.reduce((acc, db) => acc + Math.pow(10, db / 10), 0);
  return 10 * Math.log10(sumaLineal);
}

/** Velocidad del sonido en aire a ~20 °C, m/s — referencia estándar de acústica de salas. */
export const VELOCIDAD_SONIDO_MS = 343;

/**
 * Frecuencia del modo axial de orden `orden` (1, 2, 3…) en una dimensión de
 * sala de `longitudM` metros: f = orden·c/(2·longitud). Modelo de sala
 * rígida y rectangular — mismo supuesto y misma salvedad que sala.ts.
 */
export function frecuenciaModoAxialHz(longitudM: number, orden: number): number {
  return (orden * VELOCIDAD_SONIDO_MS) / (2 * longitudM);
}

/**
 * Convierte una sensibilidad medida a 2,83V/1m a su equivalente "a 1W/1m".
 * 2,83V sólo equivale a 1W cuando la impedancia es 8Ω (2,83² / 8 ≈ 1). Para otras
 * impedancias, 2,83V entrega más o menos de 1W, y ambas convenciones divergen —
 * la confusión que docs/CLAUDE.md marca como "la fuente de error más común del dominio".
 */
export function sensibilidadA1WDb(sensibilidad283VDb: number, impedanciaOhm: number): number {
  const potenciaRealA283VW = (2.83 * 2.83) / impedanciaOhm;
  return sensibilidad283VDb - 10 * Math.log10(potenciaRealA283VW);
}
