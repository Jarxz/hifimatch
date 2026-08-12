/**
 * Paso 4: el sitio sólo tiene español. El Paso 6 (bilingüe) reemplaza este
 * valor fijo por el idioma activo real (apps/web/src/idioma/idioma.ts) —
 * todo lo que hoy importa esta constante es justo lo que ese paso tiene
 * que tocar. Un solo lugar en vez de "es" repetido en cada archivo.
 */
import type { Idioma } from '../../../packages/data/src/idioma.ts';

export const IDIOMA_PROVISIONAL: Idioma = 'es';
