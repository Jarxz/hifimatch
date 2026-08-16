/**
 * Crest factor (pico/promedio) por género musical — declarado, criterio
 * del sitio con rangos típicos citados en literatura de ingeniería de
 * audio sobre rango dinámico de masterización. Varía por grabación
 * específica (una pista de rock muy comprimida puede tener menos crest
 * factor que una de jazz poco comprimida) — esto es un valor típico de
 * género, no una medición del contenido real que se escucha.
 *
 * No cambia ningún veredicto de severidad: es información adicional sobre
 * la tarjeta de potencia (qué nivel promedio implica el pico objetivo ya
 * calculado), no una regla nueva con su propio umbral ok/warn/alert.
 */

export type Genero = 'rockpop' | 'jazzvocal' | 'clasica';

export const CREST_FACTOR_DB: Record<Genero, number> = {
  rockpop: 10,
  jazzvocal: 14,
  clasica: 18,
};

/** Nivel promedio de escucha que implica un pico objetivo dado, para el
 * crest factor típico del género elegido. */
export function nivelPromedioEstimadoDb(picoObjetivoDb: number, genero: Genero): number {
  return picoObjetivoDb - CREST_FACTOR_DB[genero];
}
