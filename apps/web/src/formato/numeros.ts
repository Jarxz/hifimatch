/**
 * Reemplaza al `nf(x,d)` del prototipo (que hardcodeaba coma decimal) con
 * Intl.NumberFormat por locale. Firma final ya con `idioma` desde el
 * principio — el Paso 6 (bilingüe) sólo cambia qué argumento le pasa cada
 * sitio, no reescribe las 30+ llamadas.
 */
import type { Idioma } from '../../../../packages/data/src/idioma.ts';

const LOCALE: Record<Idioma, string> = { es: 'es-CL', en: 'en-US' };
const cache = new Map<string, Intl.NumberFormat>();

/** es-CL → '3,6' y '43.000'; en-US → '3.6' y '43,000'. */
export function num(v: number, decimales: number, idioma: Idioma): string {
  const clave = `${idioma}:${decimales}`;
  let f = cache.get(clave);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE[idioma], {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
      useGrouping: true,
    });
    cache.set(clave, f);
  }
  return f.format(v);
}

/** El signo lo pone el sitio, no Intl: usa el signo menos tipográfico
 * (U+2212), no el hyphen-minus, igual que ya hacía el prototipo. */
export function numConSigno(v: number, decimales: number, idioma: Idioma): string {
  return (v >= 0 ? '+' : '−') + num(Math.abs(v), decimales, idioma);
}

/** Coordenada/medida de SVG. SIEMPRE punto decimal ASCII, NUNCA
 * localizada: un width="123,4" es un atributo inválido y el plano se
 * rompe en silencio — sólo en español. Ver apps/web/src/vista/plano.ts. */
export function coord(v: number, decimales = 1): string {
  return v.toFixed(decimales);
}

const cacheLista = new Map<Idioma, Intl.ListFormat>();

/** Une nombres con la conjunción "y"/"and" del idioma — con coma de
 * Oxford cuando hay 3 o más ("A, B y C"), a diferencia de un
 * `join(' y ')` a mano que da "A y B y C". */
export function listaY(items: string[], idioma: Idioma): string {
  let f = cacheLista.get(idioma);
  if (!f) {
    f = new Intl.ListFormat(LOCALE[idioma], { style: 'long', type: 'conjunction' });
    cacheLista.set(idioma, f);
  }
  return f.format(items);
}
