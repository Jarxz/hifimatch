/**
 * Arma el HTML de la tarjeta `.info` de cada categoría (parlante/
 * amplificador/streamer/dac) — funciones puras, no tocan `document`.
 *
 * Hasta una ronda anterior este archivo también poblaba los 2 `<select>`
 * en cascada marca→modelo; ese mecanismo se retiró por completo al
 * reemplazar los selects por el buscador marca+modelo (Fuse.js local +
 * búsqueda web, ver `packages/buscador` y `apps/web/src/main.ts`
 * `iniciarBuscadorEquipos()`) — quedaba operando sobre elementos que ya
 * no existen en `index.html`.
 */
import { MARCA_GENERICA } from '../../../../packages/data/src/catalogo.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { chipsParlante, chipsAmplificador, chipsFuente } from '../datos/etiquetas.ts';
import { textosDe } from '../idioma/idioma.ts';
import { EQUIPO_WEB_PREFIJO } from '../../../../packages/buscador/src/buscador.ts';

/**
 * El link a la ficha/web del producto es un placeholder a propósito: no hay
 * URL curada por equipo todavía (mismo estado que "Más parlantes ·
 * próximamente"). Se ve en la esquina inferior derecha de la tarjeta, sin
 * href ni onclick, para que quede claro que es una opción futura — pensado
 * para cuando una tienda quiera linkear su ficha de producto real.
 */
function infoHtml(tipo: string, chips: string[], descripcion: string, verDescripcion: string, verFicha: string, notaGenerica: string | null): string {
  const chipsHtml = chips.map((c) => `<span>${c}</span>`).join('');
  const notaHtml = notaGenerica ? `<div class="info-nota-generico">${notaGenerica}</div>` : '';
  return (
    `<div class="info">${notaHtml}<div class="info-type">${tipo}</div><div class="chips">${chipsHtml}</div>` +
    `<details class="detalle"><summary>${verDescripcion}</summary><div class="info-desc">${descripcion}</div></details>` +
    `<div class="info-linkwrap"><span class="info-link">${verFicha}</span></div></div>`
  );
}

/** El aviso de "no curado" (búsqueda web o ficha manual, ver
 * packages/buscador/src/buscador.ts) usa el mismo mecanismo visual que
 * ya usaba `notaGenerico` para los arquetipos — un aviso al principio de
 * la tarjeta, nunca mezclado con datos citados de verdad. Se distingue
 * por el prefijo reservado del id (`EQUIPO_WEB_PREFIJO`), no por la
 * marca: acá la marca SÍ es la real (Focal, Wharfedale...), a diferencia
 * de `MARCA_GENERICA`. */
function notaDe(t: ReturnType<typeof textosDe>['config'], id: string, marca: string): string | null {
  if (id.startsWith(EQUIPO_WEB_PREFIJO)) return t.notaNoCurado;
  if (marca === MARCA_GENERICA) return t.notaGenerico;
  return null;
}

export function infoHtmlParlante(p: ParlanteCat, idioma: Idioma): string {
  const t = textosDe(idioma).config;
  return infoHtml(p.tipo[idioma], chipsParlante(p, idioma), p.descripcion[idioma], t.verDescripcion, t.verFicha, notaDe(t, p.id, p.marca));
}
export function infoHtmlAmplificador(a: AmplificadorCat, idioma: Idioma): string {
  const t = textosDe(idioma).config;
  return infoHtml(a.tipo[idioma], chipsAmplificador(a, idioma), a.descripcion[idioma], t.verDescripcion, t.verFicha, notaDe(t, a.id, a.marca));
}
export function infoHtmlFuente(f: FuenteCat, idioma: Idioma): string {
  const t = textosDe(idioma).config;
  return infoHtml(f.tipo[idioma], chipsFuente(f, idioma), f.descripcion[idioma], t.verDescripcion, t.verFicha, notaDe(t, f.id, f.marca));
}
