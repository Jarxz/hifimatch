// PURO — sin DOM. Límites de las dimensiones de sala que acepta Configurar.
// Son los mismos que tenían los sliders de siempre (no se inventan umbrales
// nuevos): definen la región en la que la disposición y las reglas de sala
// están probadas. index.html repite estos números en `min`/`max` de cada
// campo; dimensiones.test.ts compara ambos para que no se desincronicen.

export type DimensionSala = 'W' | 'L' | 'H';

export const LIMITES_DIMENSION_M: Record<DimensionSala, { min: number; max: number }> = {
  W: { min: 2.5, max: 7 },
  L: { min: 3, max: 9 },
  H: { min: 2.2, max: 3.5 },
};

export type CodigoDimension = 'ok' | 'no-numerica' | 'fuera-de-rango';

/** `valor` es lo que devuelve `input.valueAsNumber` (NaN si el campo está
 * vacío o mal escrito). El borde exacto (2,5 m, 7 m…) es válido. */
export function validarDimension(dim: DimensionSala, valor: number): CodigoDimension {
  if (!Number.isFinite(valor)) return 'no-numerica';
  const { min, max } = LIMITES_DIMENSION_M[dim];
  return valor < min || valor > max ? 'fuera-de-rango' : 'ok';
}
