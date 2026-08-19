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
  ModeloTarjetaReverberacion,
  ModeloPuntaje,
  ModeloResumenFinal,
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
  comentario: string;
}

export function pintarCadena(items: ItemCadena[]): void {
  el('chain').innerHTML = items
    .map(
      (it) =>
        `<div class="chainitem"><div class="ci-cat">${it.categoria}</div><div class="ci-name">${it.nombre}</div><div class="ci-spec">${it.espec}</div><div class="ci-comment">${it.comentario}</div></div>`
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
  el('pw-simple').textContent = m.simpleHtml;
  el('pw-text').innerHTML = m.textoHtml;
  el('pw-calc').innerHTML = m.calcHtml;
  pintarFlag('pw-flag', m.avisoHtml, false);
  el('pw-src').innerHTML = m.fuenteHtml;
  el('pw-crest').innerHTML = m.crestFactorHtml;
  actualizarMedidor(m.margenDb, idioma);
}

/**
 * "sin-datos" ya no se publica como tarjeta propia en el análisis
 * principal — se saca de acá y queda como nota en "En resumen"
 * (modeloResumenFinal/pintarResumenFinal). La tarjeta se oculta entera en
 * vez de mostrar un veredicto "Sin dato" que ocupa lugar sin decir nada
 * evaluable.
 */
export function pintarCarga(m: ModeloTarjetaCarga): void {
  const card = el('card-carga');
  if (m.sinDatos) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  pintarVerdict('z-verdict', false, m.verdictoClase, m.verdictoTexto);
  el('z-simple').textContent = m.simpleHtml;
  el('z-text').innerHTML = m.textoHtml;
  pintarFlag('z-flag', m.avisoHtml, false);
  el('z-src').innerHTML = m.fuenteHtml;
}

/**
 * Streamer y DAC son dos categorías independientes que pueden estar
 * elegidas a la vez (ver estado.ts) — cada una tiene su propio par de
 * tarjetas (card-puente-streamer/card-recorrido-streamer,
 * card-puente-dac/card-recorrido-dac) para no mezclar dos evaluaciones de
 * ganancia distintas en una sola tarjeta. `null` oculta el par de esa
 * categoría sin tocar su contenido; lo mismo si el resultado es
 * "sin-datos" — no se publica como tarjeta, sólo como nota en el resumen
 * final (ver pintarCarga).
 */
export function pintarGanancia(
  categoria: 'streamer' | 'dac',
  puente: ModeloTarjetaPuente | null,
  recorrido: ModeloTarjetaRecorrido | null
): void {
  const cardPuente = el('card-puente-' + categoria);
  const cardRecorrido = el('card-recorrido-' + categoria);

  if (!puente || puente.sinDatos) {
    cardPuente.classList.add('hidden');
  } else {
    cardPuente.classList.remove('hidden');
    pintarVerdict('pz-verdict-' + categoria, false, puente.verdictoClase, puente.verdictoTexto);
    el('pz-simple-' + categoria).textContent = puente.simpleHtml;
    el('pz-text-' + categoria).innerHTML = puente.textoHtml;
    el('pz-calc-' + categoria).innerHTML = puente.calcHtml;
    pintarFlag('pz-flag-' + categoria, puente.avisoHtml, false);
    el('pz-src-' + categoria).innerHTML = puente.fuenteHtml;
  }

  if (!recorrido || recorrido.sinDatos) {
    cardRecorrido.classList.add('hidden');
  } else {
    cardRecorrido.classList.remove('hidden');
    pintarVerdict('pv-verdict-' + categoria, false, recorrido.verdictoClase, recorrido.verdictoTexto);
    el('pv-simple-' + categoria).textContent = recorrido.simpleHtml;
    el('pv-text-' + categoria).innerHTML = recorrido.textoHtml;
    el('pv-calc-' + categoria).innerHTML = recorrido.calcHtml;
    pintarFlag('pv-flag-' + categoria, recorrido.avisoHtml, false);
    el('pv-src-' + categoria).innerHTML = recorrido.fuenteHtml;
  }
}

export function pintarPlano(svg: string): void {
  el('plan').innerHTML = svg;
}

/** A diferencia de potencia/carga/ganancia, modos de sala siempre tiene dato
 * (sólo depende de las dimensiones, nunca de equipos) — nunca "sin-datos". */
export function pintarModos(m: ModeloTarjetaModos): void {
  pintarVerdict('mo-verdict', false, m.verdictoClase, m.verdictoTexto);
  el('mo-simple').textContent = m.simpleHtml;
  el('mo-text').innerHTML = m.textoHtml;
  pintarFlag('mo-flag', m.avisoHtml, false);
  el('mo-src').innerHTML = m.fuenteHtml;
}

/** Igual que modos, siempre tiene dato (depende de dimensiones + tipo de
 * sala, nunca de equipos) — nunca "sin-datos". */
export function pintarReverberacion(m: ModeloTarjetaReverberacion): void {
  pintarVerdict('rt-verdict', false, m.verdictoClase, m.verdictoTexto);
  el('rt-simple').textContent = m.simpleHtml;
  el('rt-text').innerHTML = m.textoHtml;
  el('rt-calc').innerHTML = m.calcHtml;
  el('rt-src').innerHTML = m.fuenteHtml;
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

/** '' cuando no hay modos agrupados (construirDiagramaModalSvg ya lo
 * resuelve) — oculta el diagrama y su leyenda de gradiente. */
export function pintarDiagramaModal(svg: string, caption: string): void {
  const cont = el('mo-mapa');
  const leyenda = el('mo-mapa-leyenda');
  if (!svg) {
    cont.classList.add('hidden');
    cont.innerHTML = '';
    leyenda.classList.add('hidden');
    return;
  }
  cont.classList.remove('hidden');
  cont.innerHTML = svg + `<div class="src">${caption}</div>`;
  leyenda.classList.remove('hidden');
}

/** Capa criterio-editorial (puntaje.ts) — nunca usa pintarVerdict (el pill
 * de veredicto de capa física); el número lleva color (clase puntaje-ok/
 * warn/alert) pero sigue siendo un <b> simple, no un pill, y sigue
 * rotulado "Criterio editorial, no física" en el marcado estático. */
export function pintarPuntaje(m: ModeloPuntaje): void {
  const puntajeEl = el('pt-puntaje');
  puntajeEl.textContent = m.puntajeTexto;
  puntajeEl.className = 'puntaje-' + m.clase;
  el('pt-detalle').innerHTML = m.detalleHtml;
  pintarFlag('pt-flag', m.avisoHtml, true);
  el('pt-criterio').innerHTML = m.criterioHtml;
}

/** Recapitulación en lenguaje simple — no evalúa nada nuevo, reorganiza y
 * detalla lo que ya mostraron las tarjetas de arriba (ver
 * modeloResumenFinal). */
export function pintarResumenFinal(m: ModeloResumenFinal): void {
  el('rf-comportamiento').textContent = m.comportamientoHtml;
  el('rf-resumen').textContent = m.resumenHtml;
  el('rf-fortalezas').innerHTML = m.fortalezasHtml;
  el('rf-debilidades').innerHTML = m.debilidadesHtml;
  const sinDatosWrap = el('rf-sindatos-wrap');
  if (m.sinDatosHtml) {
    sinDatosWrap.classList.remove('hidden');
    el('rf-sindatos').innerHTML = m.sinDatosHtml;
  } else {
    sinDatosWrap.classList.add('hidden');
  }
  el('rf-recomendaciones').innerHTML = m.recomendacionesHtml;
}
