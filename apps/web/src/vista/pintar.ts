/**
 * Única capa que escribe en el DOM del resultado. Todo el texto ya viene
 * formateado desde resultado.ts (puro); acá sólo se asigna a elementos.
 */
import type {
  ModeloTarjetaPotencia,
  ModeloTarjetaCarga,
  ModeloTarjetaPuente,
  ModeloTarjetaRecorrido,
  ModeloTarjetaModos,
  ModeloPuntaje,
} from './resultado.ts';
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

/**
 * Streamer y DAC son dos categorías independientes que pueden estar
 * elegidas a la vez (ver estado.ts) — cada una tiene su propio par de
 * tarjetas (card-puente-streamer/card-recorrido-streamer,
 * card-puente-dac/card-recorrido-dac) para no mezclar dos evaluaciones de
 * ganancia distintas en una sola tarjeta. `null` oculta el par de esa
 * categoría sin tocar su contenido.
 */
export function pintarGanancia(
  categoria: 'streamer' | 'dac',
  puente: ModeloTarjetaPuente | null,
  recorrido: ModeloTarjetaRecorrido | null
): void {
  const cardPuente = el('card-puente-' + categoria);
  const cardRecorrido = el('card-recorrido-' + categoria);

  if (!puente || !recorrido) {
    cardPuente.classList.add('hidden');
    cardRecorrido.classList.add('hidden');
    return;
  }

  cardPuente.classList.remove('hidden');
  cardRecorrido.classList.remove('hidden');

  pintarVerdict('pz-verdict-' + categoria, puente.sinDatos, puente.verdictoClase, puente.verdictoTexto);
  el('pz-text-' + categoria).innerHTML = puente.textoHtml;
  el('pz-calc-' + categoria).innerHTML = puente.calcHtml;
  pintarFlag('pz-flag-' + categoria, puente.avisoHtml, puente.avisoEsSinDatos);
  el('pz-src-' + categoria).innerHTML = puente.fuenteHtml;

  pintarVerdict('pv-verdict-' + categoria, recorrido.sinDatos, recorrido.verdictoClase, recorrido.verdictoTexto);
  el('pv-text-' + categoria).innerHTML = recorrido.textoHtml;
  el('pv-calc-' + categoria).innerHTML = recorrido.calcHtml;
  pintarFlag('pv-flag-' + categoria, recorrido.avisoHtml, recorrido.avisoEsSinDatos);
  el('pv-src-' + categoria).innerHTML = recorrido.fuenteHtml;
}

export function pintarPlano(svg: string): void {
  el('plan').innerHTML = svg;
}

/** A diferencia de potencia/carga/ganancia, modos de sala siempre tiene dato
 * (sólo depende de las dimensiones, nunca de equipos) — nunca "sin-datos". */
export function pintarModos(m: ModeloTarjetaModos): void {
  pintarVerdict('mo-verdict', false, m.verdictoClase, m.verdictoTexto);
  el('mo-text').innerHTML = m.textoHtml;
  el('mo-lista').innerHTML = m.listaHtml;
  pintarFlag('mo-flag', m.avisoHtml, false);
  el('mo-src').innerHTML = m.fuenteHtml;
}

/** '' cuando no hay modos agrupados (construirCurvasModalesSvg ya lo
 * resuelve) — oculta el bloque en vez de dejar un contenedor vacío. */
export function pintarCurvasModales(svg: string, caption: string): void {
  const cont = el('mo-curvas');
  if (!svg) {
    cont.classList.add('hidden');
    cont.innerHTML = '';
    return;
  }
  cont.classList.remove('hidden');
  cont.innerHTML = svg + `<div class="src">${caption}</div>`;
}

/** Capa criterio-editorial (puntaje.ts) — nunca usa pintarVerdict/las clases
 * ok/warn/alert de la capa física; es un número simple en un <b>. */
export function pintarPuntaje(m: ModeloPuntaje): void {
  el('pt-puntaje').textContent = m.puntajeTexto;
  el('pt-detalle').innerHTML = m.detalleHtml;
  pintarFlag('pt-flag', m.avisoHtml, true);
  el('pt-criterio').innerHTML = m.criterioHtml;
}
