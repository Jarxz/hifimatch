/** Puebla los selectores marca→modelo del catálogo y arma el HTML de la tarjeta .info de cada categoría. */
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { chipsParlante, chipsAmplificador, chipsFuente } from '../datos/etiquetas.ts';
import { textosDe } from '../idioma/idioma.ts';

type Kind = 'spk' | 'amp' | 'streamer' | 'dac';

function catalogoDe(kind: Kind): readonly { id: string; marca: string; nombre: string }[] {
  if (kind === 'spk') return CATALOGO.parlantes;
  if (kind === 'amp') return CATALOGO.amplificadores;
  if (kind === 'streamer') return CATALOGO.streamers;
  return CATALOGO.dacs;
}

/** marca no se traduce — el orden alfabético (`localeCompare`) es estable
 * entre idiomas. No asume que el catálogo ya viene agrupado por marca:
 * junta únicas y ordena de forma explícita. */
function marcasUnicas(items: readonly { marca: string }[]): string[] {
  return [...new Set(items.map((it) => it.marca))].sort((a, b) => a.localeCompare(b));
}

function modelosDeMarca<T extends { marca: string }>(items: readonly T[], marca: string): readonly T[] {
  return items.filter((it) => it.marca === marca);
}

function elSelect(id: string): HTMLSelectElement | null {
  return document.getElementById(id) as HTMLSelectElement | null;
}

const SEL_MARCA: Record<Kind, string> = { spk: 'sel-spk-marca', amp: 'sel-amp-marca', streamer: 'sel-streamer-marca', dac: 'sel-dac-marca' };
const SEL_MODELO: Record<Kind, string> = { spk: 'sel-spk', amp: 'sel-amp', streamer: 'sel-streamer', dac: 'sel-dac' };

/**
 * Placeholder de la marca: los dos requeridos (parlante/ampli) usan
 * "— Marca —"; los dos opcionales (streamer/dac) reusan la misma clave de
 * "Ninguno (opcional)" que ya usaban como placeholder del modelo — elegir
 * ese primer valor sigue significando "sin fuente", ahora un paso antes.
 */
const MARCA_CLAVE: Record<Kind, 'marcaPlaceholder' | 'fuentePlaceholder'> = {
  spk: 'marcaPlaceholder',
  amp: 'marcaPlaceholder',
  streamer: 'fuentePlaceholder',
  dac: 'fuentePlaceholder',
};

const MAS_CLAVE: Record<Kind, 'masParlantes' | 'masAmplificadores' | 'masStreamers' | 'masDacs'> = {
  spk: 'masParlantes',
  amp: 'masAmplificadores',
  streamer: 'masStreamers',
  dac: 'masDacs',
};

/**
 * Puebla los 4 selects de marca (una sola vez, al arrancar — la lista de
 * marcas no cambia con el idioma) y deja los 4 de modelo deshabilitados,
 * a la espera de que se elija una marca. El aviso "Más X · próximamente"
 * vive acá, al final de la lista de marcas — antes vivía duplicado al
 * final de cada lista de modelos.
 */
export function poblarSelectores(idioma: Idioma): void {
  const t = textosDe(idioma).config;
  (['spk', 'amp', 'streamer', 'dac'] as const).forEach((kind) => {
    const selMarca = elSelect(SEL_MARCA[kind]);
    if (!selMarca) return;
    const marcas = marcasUnicas(catalogoDe(kind));
    const claveMarca = MARCA_CLAVE[kind];
    const claveMas = MAS_CLAVE[kind];
    selMarca.innerHTML =
      `<option value="" data-i18n="config.${claveMarca}">${t[claveMarca]}</option>` +
      marcas.map((m) => `<option value="${m}">${m}</option>`).join('') +
      `<option value="" disabled data-i18n="config.${claveMas}">${t[claveMas]}</option>`;
    vaciarModelos(kind, idioma);
  });
}

/** Deja el select de modelo deshabilitado con un único option explicando
 * que hace falta elegir marca primero — se llama al arrancar y cada vez
 * que la marca vuelve al placeholder ("Ninguno"/sin elegir). */
export function vaciarModelos(kind: Kind, idioma: Idioma): void {
  const selModelo = elSelect(SEL_MODELO[kind]);
  if (!selModelo) return;
  const t = textosDe(idioma).config;
  selModelo.innerHTML = `<option value="" data-i18n="config.modeloSinMarca">${t.modeloSinMarca}</option>`;
  selModelo.disabled = true;
  selModelo.classList.add('empty');
}

/** Puebla el select de modelo con los equipos de una marca — habilitado,
 * con el placeholder "— Modelo —" seleccionado (nunca preselecciona un
 * modelo real: cambiar de marca siempre vuelve a pedir elegir modelo). */
export function poblarModelos(kind: Kind, marca: string, idioma: Idioma): void {
  const selModelo = elSelect(SEL_MODELO[kind]);
  if (!selModelo) return;
  const t = textosDe(idioma).config;
  const modelos = modelosDeMarca(catalogoDe(kind), marca);
  selModelo.innerHTML = `<option value="" data-i18n="config.modeloPlaceholder">${t.modeloPlaceholder}</option>` + modelos.map((it) => `<option value="${it.id}">${it.nombre}</option>`).join('');
  selModelo.disabled = false;
  selModelo.classList.add('empty');
}

/**
 * El link a la ficha/web del producto es un placeholder a propósito: no hay
 * URL curada por equipo todavía (mismo estado que "Más parlantes ·
 * próximamente"). Se ve en la esquina inferior derecha de la tarjeta, sin
 * href ni onclick, para que quede claro que es una opción futura — pensado
 * para cuando una tienda quiera linkear su ficha de producto real.
 */
function infoHtml(tipo: string, chips: string[], descripcion: string, verDescripcion: string, verFicha: string): string {
  const chipsHtml = chips.map((c) => `<span>${c}</span>`).join('');
  return (
    `<div class="info"><div class="info-type">${tipo}</div><div class="chips">${chipsHtml}</div>` +
    `<details class="detalle"><summary>${verDescripcion}</summary><div class="info-desc">${descripcion}</div></details>` +
    `<div class="info-linkwrap"><span class="info-link">${verFicha}</span></div></div>`
  );
}

export function infoHtmlParlante(p: ParlanteCat, idioma: Idioma): string {
  const t = textosDe(idioma).config;
  return infoHtml(p.tipo[idioma], chipsParlante(p, idioma), p.descripcion[idioma], t.verDescripcion, t.verFicha);
}
export function infoHtmlAmplificador(a: AmplificadorCat, idioma: Idioma): string {
  const t = textosDe(idioma).config;
  return infoHtml(a.tipo[idioma], chipsAmplificador(a, idioma), a.descripcion[idioma], t.verDescripcion, t.verFicha);
}
export function infoHtmlFuente(f: FuenteCat, idioma: Idioma): string {
  const t = textosDe(idioma).config;
  return infoHtml(f.tipo[idioma], chipsFuente(f, idioma), f.descripcion[idioma], t.verDescripcion, t.verFicha);
}
