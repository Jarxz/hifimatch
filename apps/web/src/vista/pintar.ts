/**
 * Única capa que escribe en el DOM del resultado. Todo el texto ya viene
 * formateado desde resultado.ts (puro); acá sólo se asigna a elementos.
 */
import type { ModeloTarjetaPotencia, ModeloTarjetaCarga, ModeloTarjetaPuente, ModeloTarjetaRecorrido } from './resultado.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { actualizarMedidor } from './medidor.ts';

function el(id: string): HTMLElement {
  const e = document.getElementById(id);
  if (!e) throw new Error(`elemento no encontrado: #${id}`);
  return e;
}

function pintarVerdict(id: string, sinDatos: boolean, clase: string, texto: string): void {
  const v = el(id);
  if (sinDatos) {
    v.className = 'verdict';
    v.style.color = 'var(--dim)';
  } else {
    v.className = 'verdict ' + clase;
    v.style.color = '';
  }
  v.textContent = texto;
}

function pintarFlag(id: string, avisoHtml: string | null, esSinDatos: boolean): void {
  const flag = el(id);
  if (avisoHtml) {
    flag.className = esSinDatos ? 'flag sindato' : 'flag';
    flag.innerHTML = avisoHtml;
  } else {
    flag.className = 'flag hidden';
  }
}

export interface ItemCadena {
  categoria: string;
  nombre: string;
  espec: string;
}

export function pintarCadena(items: ItemCadena[]): void {
  el('chain').innerHTML = items
    .map(
      (it) =>
        `<div class="chainitem"><div class="ci-cat">${it.categoria}</div><div class="ci-name">${it.nombre}</div><div class="ci-spec">${it.espec}</div></div>`
    )
    .join('');
}

export function pintarSala(anchoLargo: string, alto: string, distancia: string, nivel: string, pico: string): void {
  el('r-wl').textContent = anchoLargo;
  el('r-h').textContent = alto;
  el('r-dist').textContent = distancia;
  el('r-lvl').textContent = nivel;
  el('r-peak').textContent = pico;
}

export function pintarPotencia(m: ModeloTarjetaPotencia, idioma: Idioma): void {
  pintarVerdict('pw-verdict', false, m.verdictoClase, m.verdictoTexto);
  el('pw-text').innerHTML = m.textoHtml;
  el('pw-calc').innerHTML = m.calcHtml;
  pintarFlag('pw-flag', m.avisoHtml, false);
  el('pw-src').innerHTML = m.fuenteHtml;
  actualizarMedidor(m.margenDb, idioma);
}

export function pintarCarga(m: ModeloTarjetaCarga): void {
  pintarVerdict('z-verdict', m.sinDatos, m.verdictoClase, m.verdictoTexto);
  el('z-text').innerHTML = m.textoHtml;
  pintarFlag('z-flag', m.avisoHtml, m.avisoEsSinDatos);
  el('z-src').innerHTML = m.fuenteHtml;
}

/** null cuando no hay fuente elegida: oculta ambas tarjetas y no toca su contenido. */
export function pintarGanancia(puente: ModeloTarjetaPuente | null, recorrido: ModeloTarjetaRecorrido | null): void {
  const cardPuente = el('card-puente');
  const cardRecorrido = el('card-recorrido');

  if (!puente || !recorrido) {
    cardPuente.classList.add('hidden');
    cardRecorrido.classList.add('hidden');
    return;
  }

  cardPuente.classList.remove('hidden');
  cardRecorrido.classList.remove('hidden');

  pintarVerdict('pz-verdict', puente.sinDatos, puente.verdictoClase, puente.verdictoTexto);
  el('pz-text').innerHTML = puente.textoHtml;
  el('pz-calc').innerHTML = puente.calcHtml;
  pintarFlag('pz-flag', puente.avisoHtml, puente.avisoEsSinDatos);
  el('pz-src').innerHTML = puente.fuenteHtml;

  pintarVerdict('pv-verdict', recorrido.sinDatos, recorrido.verdictoClase, recorrido.verdictoTexto);
  el('pv-text').innerHTML = recorrido.textoHtml;
  el('pv-calc').innerHTML = recorrido.calcHtml;
  pintarFlag('pv-flag', recorrido.avisoHtml, recorrido.avisoEsSinDatos);
  el('pv-src').innerHTML = recorrido.fuenteHtml;
}

export function pintarPlano(svg: string): void {
  el('plan').innerHTML = svg;
}
