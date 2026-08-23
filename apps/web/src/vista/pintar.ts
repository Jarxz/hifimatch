/**
 * Única capa que escribe en el DOM del resultado. Todo el texto ya viene
 * formateado desde resultado.ts (puro); acá sólo se asigna a elementos.
 */
import type {
  ModeloTarjetaPotencia,
  ModeloTarjetaCarga,
  ModeloTarjetaAmortiguamiento,
  ModeloTarjetaPuente,
  ModeloTarjetaRecorrido,
  ModeloTarjetaModos,
  ModeloTarjetaFiltroPeine,
  ModeloTarjetaTrianguloEscucha,
  ModeloTarjetaReverberacion,
  ModeloDocumento,
  ModeloVeredicto,
  ModeloEstadoGrupo,
} from './resultado.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { actualizarMedidor, construirEscala } from './medidor.ts';

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

/** Caja `.calc` opcional — a diferencia de potencia/puente/recorrido
 * (siempre tienen cálculo), carga y amortiguamiento sólo lo muestran
 * cuando el dato de base (ángulo de fase / factor de amortiguamiento)
 * permitió calcularlo. */
function pintarCalcOpcional(id: string, calcHtml: string | null): void {
  const calc = el(id);
  if (calcHtml) {
    calc.classList.remove('hidden');
    calc.innerHTML = calcHtml;
  } else {
    calc.classList.add('hidden');
    calc.innerHTML = '';
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
  pintarCalcOpcional('z-calc', m.calcHtml);
  pintarFlag('z-flag', m.avisoHtml, false);
  el('z-src').innerHTML = m.fuenteHtml;
}

/** Igual patrón que pintarCarga: tarjeta entera oculta si falta el factor
 * de amortiguamiento o la impedancia mínima (sin-datos, catálogo todavía
 * sin poblar estos campos para ningún equipo). */
export function pintarAmortiguamiento(m: ModeloTarjetaAmortiguamiento): void {
  const card = el('card-amortiguamiento');
  if (m.sinDatos) {
    card.classList.add('hidden');
    return;
  }
  card.classList.remove('hidden');
  pintarVerdict('am-verdict', false, m.verdictoClase, m.verdictoTexto);
  el('am-simple').textContent = m.simpleHtml;
  el('am-text').innerHTML = m.textoHtml;
  pintarCalcOpcional('am-calc', m.calcHtml);
  pintarFlag('am-flag', m.avisoHtml, false);
  el('am-src').innerHTML = m.fuenteHtml;
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

/** Filtro peine por reflexión — igual patrón que pintarModos: siempre tiene
 * dato (sólo depende de disposición + materiales, nunca del catálogo),
 * nunca "sin-datos". */
export function pintarFiltroPeine(m: ModeloTarjetaFiltroPeine): void {
  pintarVerdict('fp-verdict', false, m.verdictoClase, m.verdictoTexto);
  el('fp-simple').textContent = m.simpleHtml;
  el('fp-text').innerHTML = m.textoHtml;
  el('fp-calc').innerHTML = m.calcHtml;
  pintarFlag('fp-flag', m.avisoHtml, false);
  el('fp-src').innerHTML = m.fuenteHtml;
}

/** Triángulo de escucha (asimetría + ángulo) — mismo patrón, siempre tiene dato. */
export function pintarTrianguloEscucha(m: ModeloTarjetaTrianguloEscucha): void {
  pintarVerdict('te-verdict', false, m.verdictoClase, m.verdictoTexto);
  el('te-simple').textContent = m.simpleHtml;
  el('te-text').innerHTML = m.textoHtml;
  el('te-calc').innerHTML = m.calcHtml;
  pintarFlag('te-flag', m.avisoHtml, false);
  el('te-src').innerHTML = m.fuenteHtml;
}

/** La tarjeta siempre se muestra (nunca se oculta, a diferencia de
 * carga/ganancia con datos realmente faltantes) — pero el RT60 estimado ya
 * no emite veredicto ok/warn: `m.verdictoClase` es siempre 'dim', así que
 * el badge se pinta en gris (mismo tratamiento que "sin-datos" en el resto
 * del sitio), nunca con un color de severidad. */
export function pintarReverberacion(m: ModeloTarjetaReverberacion): void {
  pintarVerdict('rt-verdict', m.verdictoClase === 'dim', m.verdictoClase, m.verdictoTexto);
  el('rt-simple').textContent = m.simpleHtml;
  el('rt-text').innerHTML = m.textoHtml;
  el('rt-calc').innerHTML = m.calcHtml;
  el('rt-src').innerHTML = m.fuenteHtml;
}

/** '' cuando ningún componente quedó "sin-datos" (catálogo sin el dato que
 * la regla necesita) — oculta la nota entera en vez de una confirmación
 * vacía de que "todo tenía dato". Deliberadamente distinta de la tarjeta
 * de Reverberación (ver `pintarReverberacion`): esa siempre se muestra
 * como "todavía no medido"; esto es sólo huecos de catálogo, y sólo
 * aparece cuando hay al menos uno. */
export function pintarNotaSinDatos(html: string): void {
  const cont = el('nota-sindatos');
  if (!html) {
    cont.classList.add('hidden');
    cont.innerHTML = '';
    return;
  }
  cont.classList.remove('hidden');
  cont.innerHTML = html;
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

/** Un grupo de "Tres estados" (Potencia / Acople eléctrico / Sala) —
 * `prefijo` es 'potencia'|'acople'|'sala', matching los ids de
 * index.html (`est-<prefijo>-nombre/estado/detalle`). */
function pintarEstadoGrupo(prefijo: string, g: ModeloEstadoGrupo): void {
  el(`est-${prefijo}`).className = 'estado-item est-' + g.clase;
  el(`est-${prefijo}-nombre`).textContent = g.nombre;
  const estadoEl = el(`est-${prefijo}-estado`);
  estadoEl.textContent = g.estadoTexto;
  estadoEl.className = 'est-estado est-' + g.clase;
  el(`est-${prefijo}-detalle`).textContent = g.detalleTexto;
}

/** "Veredicto" + "Tres estados" — la única evaluación de conjunto del
 * sitio (ver CLAUDE.md, "Veredicto y tres estados"); reemplazó por
 * completo a un puntaje 1-10 de una ronda anterior, ya retirado. */
export function pintarVeredicto(m: ModeloVeredicto): void {
  const card = el('veredicto-card');
  card.className = 'card veredicto-card veredicto-' + m.clase;
  el('vd-titulo').textContent = m.tituloHtml;
  el('vd-subtexto').textContent = m.subtextoHtml;
  pintarEstadoGrupo('potencia', m.potencia);
  pintarEstadoGrupo('acople', m.acopleElectrico);
  pintarEstadoGrupo('sala', m.sala);
}

/** "Qué conviene hacer" — máximo 3 recomendaciones, las de mayor
 * severidad primero (ver `modeloRecomendacionesTop`). */
export function pintarRecomendacionesTop(html: string): void {
  el('top-recomendaciones').innerHTML = html;
}

/** Pinta la vista previa interna "Documento" (#s-documento, sin botón
 * visible — ver CLAUDE.md). Se llama junto con pintarSnapshot para que
 * siempre muestre el análisis vigente, aunque la pantalla misma no tenga
 * ningún punto de entrada real todavía. */
export function pintarDocumento(m: ModeloDocumento, margenDbPotencia: number, idioma: Idioma): void {
  el('doc-fecha').textContent = m.fechaTexto;
  el('doc-equipos').innerHTML = m.equiposHtml;
  el('doc-r-wl').textContent = m.anchoLargoTexto;
  el('doc-r-h').textContent = m.altoTexto;
  el('doc-r-dist').textContent = m.distanciaTexto;
  el('doc-r-lvl').textContent = m.nivelTexto;
  el('doc-r-peak').textContent = m.picoTexto;
  el('doc-plano').innerHTML = m.planoHtml;
  const veredictoEl = el('doc-veredicto-titulo');
  veredictoEl.textContent = m.veredictoTituloHtml;
  veredictoEl.className = 'doc-veredicto-titulo doc-veredicto-' + m.veredictoClase;
  el('doc-secciones').innerHTML = m.seccionesHtml;
  el('doc-resumen').innerHTML = m.resumenHtml;

  // El medidor de potencia (medidor.ts) es DOM, no texto puro — se
  // reconstruye acá después de inyectar seccionesHtml (que ya trajo el
  // <div id="doc-pw-scale"> vacío), con prefijo 'doc-pw' para no chocar
  // con los ids del medidor de la tarjeta de potencia (prefijo 'pw').
  const escalaDoc = document.getElementById('doc-pw-scale');
  if (escalaDoc) {
    construirEscala(escalaDoc, 'doc-pw');
    actualizarMedidor(margenDbPotencia, idioma, 'doc-pw');
  }
}
