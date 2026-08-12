/** Puebla los <select> del catálogo y arma el HTML de la tarjeta .info de cada categoría. */
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import { chipsParlante, chipsAmplificador, chipsFuente } from '../datos/etiquetas.ts';
import { IDIOMA_PROVISIONAL as IDIOMA } from '../idioma-provisional.ts';

function opciones(items: readonly { id: string; nombre: string }[]): string {
  return items.map((it) => `<option value="${it.id}">${it.nombre}</option>`).join('');
}

export function poblarSelectores(): void {
  const selSpk = document.getElementById('sel-spk') as HTMLSelectElement | null;
  const selAmp = document.getElementById('sel-amp') as HTMLSelectElement | null;
  const selFuente = document.getElementById('sel-fuente') as HTMLSelectElement | null;
  if (!selSpk || !selAmp || !selFuente) return;

  selSpk.innerHTML =
    '<option value="">— Selecciona —</option>' +
    opciones(CATALOGO.parlantes) +
    '<option value="" disabled>Más parlantes · próximamente</option>';

  selAmp.innerHTML =
    '<option value="">— Selecciona —</option>' +
    opciones(CATALOGO.amplificadores) +
    '<option value="" disabled>Más amplificadores · próximamente</option>';

  selFuente.innerHTML =
    '<option value="">— Ninguna (opcional) —</option>' +
    opciones(CATALOGO.fuentes) +
    '<option value="" disabled>Más streamers/DACs · próximamente</option>';
}

function infoHtml(tipo: string, chips: string[], descripcion: string): string {
  const chipsHtml = chips.map((c) => `<span>${c}</span>`).join('');
  return `<div class="info"><div class="info-type">${tipo}</div><div class="chips">${chipsHtml}</div><div class="info-desc">${descripcion}</div></div>`;
}

export function infoHtmlParlante(p: ParlanteCat): string {
  return infoHtml(p.tipo[IDIOMA], chipsParlante(p), p.descripcion[IDIOMA]);
}
export function infoHtmlAmplificador(a: AmplificadorCat): string {
  return infoHtml(a.tipo[IDIOMA], chipsAmplificador(a), a.descripcion[IDIOMA]);
}
export function infoHtmlFuente(f: FuenteCat): string {
  return infoHtml(f.tipo[IDIOMA], chipsFuente(f), f.descripcion[IDIOMA]);
}
