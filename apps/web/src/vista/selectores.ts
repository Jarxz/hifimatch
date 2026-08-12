/** Puebla los <select> del catálogo y arma el HTML de la tarjeta .info de cada categoría. */
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { chipsParlante, chipsAmplificador, chipsFuente } from '../datos/etiquetas.ts';
import { textosDe } from '../idioma/idioma.ts';

function opciones(items: readonly { id: string; nombre: string }[]): string {
  return items.map((it) => `<option value="${it.id}">${it.nombre}</option>`).join('');
}

/**
 * Se llama una sola vez, al arrancar. Los <option> de equipos no necesitan
 * repoblarse al cambiar de idioma (`nombre` no se traduce); los tres
 * placeholders sí, y llevan su propio data-i18n para que el barrido
 * genérico de aplicarCromoEstatico() los actualice sin reconstruir el
 * <select> — reconstruirlo perdería la opción ya seleccionada.
 */
export function poblarSelectores(idioma: Idioma): void {
  const t = textosDe(idioma).config;
  const selSpk = document.getElementById('sel-spk') as HTMLSelectElement | null;
  const selAmp = document.getElementById('sel-amp') as HTMLSelectElement | null;
  const selFuente = document.getElementById('sel-fuente') as HTMLSelectElement | null;
  if (!selSpk || !selAmp || !selFuente) return;

  selSpk.innerHTML =
    `<option value="" data-i18n="config.selectPlaceholder">${t.selectPlaceholder}</option>` +
    opciones(CATALOGO.parlantes) +
    `<option value="" disabled data-i18n="config.masParlantes">${t.masParlantes}</option>`;

  selAmp.innerHTML =
    `<option value="" data-i18n="config.selectPlaceholder">${t.selectPlaceholder}</option>` +
    opciones(CATALOGO.amplificadores) +
    `<option value="" disabled data-i18n="config.masAmplificadores">${t.masAmplificadores}</option>`;

  selFuente.innerHTML =
    `<option value="" data-i18n="config.fuentePlaceholder">${t.fuentePlaceholder}</option>` +
    opciones(CATALOGO.fuentes) +
    `<option value="" disabled data-i18n="config.masFuentes">${t.masFuentes}</option>`;
}

function infoHtml(tipo: string, chips: string[], descripcion: string): string {
  const chipsHtml = chips.map((c) => `<span>${c}</span>`).join('');
  return `<div class="info"><div class="info-type">${tipo}</div><div class="chips">${chipsHtml}</div><div class="info-desc">${descripcion}</div></div>`;
}

export function infoHtmlParlante(p: ParlanteCat, idioma: Idioma): string {
  return infoHtml(p.tipo[idioma], chipsParlante(p, idioma), p.descripcion[idioma]);
}
export function infoHtmlAmplificador(a: AmplificadorCat, idioma: Idioma): string {
  return infoHtml(a.tipo[idioma], chipsAmplificador(a, idioma), a.descripcion[idioma]);
}
export function infoHtmlFuente(f: FuenteCat, idioma: Idioma): string {
  return infoHtml(f.tipo[idioma], chipsFuente(f, idioma), f.descripcion[idioma]);
}
