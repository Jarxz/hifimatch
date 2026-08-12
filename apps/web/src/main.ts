import './estilos.css';
import { CATALOGO } from '../../../packages/data/src/catalogo.ts';
import { calcularDisposicion } from '../../../packages/engine/src/sala.ts';
import { evaluarPotencia, PICO_OBJETIVO_DB } from '../../../packages/engine/src/potencia.ts';
import { evaluarCarga } from '../../../packages/engine/src/carga.ts';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from '../../../packages/engine/src/ganancia.ts';
import type { NivelEscucha } from '../../../packages/engine/src/potencia.ts';
import type { Idioma } from '../../../packages/data/src/idioma.ts';

import { estado } from './estado.ts';
import type { NivelUI } from './estado.ts';
import { ir } from './vista/pantallas.ts';
import { poblarSelectores, infoHtmlParlante, infoHtmlAmplificador, infoHtmlFuente } from './vista/selectores.ts';
import { construirEscala } from './vista/medidor.ts';
import { construirPlanoSvg } from './vista/plano.ts';
import { modeloPotencia, modeloCarga, modeloPuente, modeloRecorrido } from './vista/resultado.ts';
import { pintarCadena, pintarSala, pintarPotencia, pintarCarga, pintarGanancia, pintarPlano } from './vista/pintar.ts';
import { parlanteDelCatalogo, amplificadorDelCatalogo, fuenteDelCatalogo } from './datos/adaptadores.ts';
import { especParlante, especAmplificador, especFuente } from './datos/etiquetas.ts';
import { num } from './formato/numeros.ts';
import { idiomaInicial, guardarIdioma, aplicarCromoEstatico, textosDe } from './idioma/idioma.ts';

const NIVEL_MOTOR: Record<NivelUI, NivelEscucha> = { mod: 'moderado', alto: 'alto', ref: 'referencia' };

let idiomaActual: Idioma = idiomaInicial();

function nivelTextoDe(lvl: NivelUI, idioma: Idioma): string {
  const t = textosDe(idioma).config;
  return { mod: t.nivelModerado, alto: t.nivelAlto, ref: t.nivelReferencia }[lvl];
}

function buscarParlante(id: string) {
  const p = CATALOGO.parlantes.find((x) => x.id === id);
  if (!p) throw new Error(`parlante no encontrado: ${id}`);
  return p;
}
function buscarAmplificador(id: string) {
  const a = CATALOGO.amplificadores.find((x) => x.id === id);
  if (!a) throw new Error(`amplificador no encontrado: ${id}`);
  return a;
}
function buscarFuente(id: string) {
  const f = CATALOGO.fuentes.find((x) => x.id === id);
  if (!f) throw new Error(`fuente no encontrada: ${id}`);
  return f;
}

/** Geometría de sala derivada del estado actual — delega en el motor real. */
function disposicionActual() {
  const sala = { anchoM: estado.W, largoM: estado.L, altoM: estado.H };
  return { sala, disposicion: calcularDisposicion(sala) };
}

/** Los tres valores de dimensión (v-W/v-L/v-H) no son data-i18n: son número
 * formateado + "m", hay que reformatearlos a mano en cada cambio de idioma. */
function actualizarTextosDimension(): void {
  (['W', 'L', 'H'] as const).forEach((dim) => {
    const decimales = dim === 'H' ? 2 : 1;
    const el = document.getElementById('v-' + dim);
    if (el) el.textContent = num(estado[dim], decimales, idiomaActual) + ' m';
  });
}

function refrescar(): void {
  const t = textosDe(idiomaActual).config;
  const { disposicion } = disposicionActual();
  const vDist = document.getElementById('v-dist');
  const vVol = document.getElementById('v-vol');
  if (vDist) vDist.textContent = num(disposicion.distanciaEscuchaM, 1, idiomaActual) + ' m';
  if (vVol) vVol.textContent = num(disposicion.volumenM3, 0, idiomaActual) + ' m³';

  const ok = estado.spk !== null && estado.amp !== null;
  const btn = document.getElementById('btn-an') as HTMLButtonElement | null;
  if (btn) btn.disabled = !ok;

  const miss = document.getElementById('miss');
  if (miss) {
    const faltantes = [!estado.spk ? t.faltaParlantes : null, !estado.amp ? t.faltaAmplificador : null].filter(
      (x): x is string => x !== null
    );
    miss.textContent = ok ? '' : t.faltaElegir({ que: faltantes.join(t.faltaY) });
  }
}

function infoHTML(kind: 'spk' | 'amp' | 'fuente', id: string): string {
  if (kind === 'spk') return infoHtmlParlante(buscarParlante(id), idiomaActual);
  if (kind === 'amp') return infoHtmlAmplificador(buscarAmplificador(id), idiomaActual);
  return infoHtmlFuente(buscarFuente(id), idiomaActual);
}

function pick(kind: 'spk' | 'amp' | 'fuente', valor: string): void {
  const sel = document.getElementById('sel-' + kind) as HTMLSelectElement | null;
  const box = document.getElementById('info-' + kind);
  if (!sel || !box) return;

  if (!valor) {
    estado[kind] = null;
    sel.classList.add('empty');
    box.innerHTML = '';
  } else {
    estado[kind] = valor;
    sel.classList.remove('empty');
    box.innerHTML = infoHTML(kind, valor);
  }
  refrescar();
}

function setDim(dim: 'W' | 'L' | 'H', valor: number): void {
  estado[dim] = valor;
  actualizarTextosDimension();
  refrescar();
}

function setNivel(lvl: NivelUI): void {
  estado.lvl = lvl;
  document.querySelectorAll<HTMLButtonElement>('.segs button[data-lvl]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lvl === lvl));
  });
}

/** El núcleo de "Analizar": calcula y pinta las cuatro tarjetas de resultado
 * más el plano. Separado de analizar() para poder llamarlo de nuevo al
 * cambiar de idioma sin forzar la navegación a la pantalla de resultado. */
function renderizarResultado(): void {
  if (!estado.spk || !estado.amp) return;

  const spk = buscarParlante(estado.spk);
  const amp = buscarAmplificador(estado.amp);
  const fuente = estado.fuente ? buscarFuente(estado.fuente) : null;

  const parlanteM = parlanteDelCatalogo(spk, idiomaActual);
  const ampM = amplificadorDelCatalogo(amp, idiomaActual);

  const { sala, disposicion } = disposicionActual();
  const t = textosDe(idiomaActual);
  const nivelTexto = nivelTextoDe(estado.lvl, idiomaActual);
  const picoObjetivo = PICO_OBJETIVO_DB[NIVEL_MOTOR[estado.lvl]];

  const items = [
    { categoria: t.resultado.itemParlantes, nombre: spk.nombre, espec: especParlante(spk, idiomaActual) },
    { categoria: t.resultado.itemAmplificador, nombre: amp.nombre, espec: especAmplificador(amp, idiomaActual) },
  ];
  if (fuente) items.push({ categoria: t.resultado.itemFuente, nombre: fuente.nombre, espec: especFuente(fuente, idiomaActual) });
  pintarCadena(items);

  pintarSala(
    `${num(sala.anchoM, 1, idiomaActual)} × ${num(sala.largoM, 1, idiomaActual)} m`,
    `${num(sala.altoM, 2, idiomaActual)} m`,
    `≈ ${num(disposicion.distanciaEscuchaM, 1, idiomaActual)} m`,
    nivelTexto,
    `${num(picoObjetivo, 0, idiomaActual)} dB`
  );

  const resPot = evaluarPotencia(parlanteM, ampM, disposicion.distanciaEscuchaM, NIVEL_MOTOR[estado.lvl]);
  pintarPotencia(
    modeloPotencia(spk, amp, resPot, disposicion.distanciaEscuchaM, nivelTexto, picoObjetivo, idiomaActual),
    idiomaActual
  );

  const resCarga = evaluarCarga(parlanteM, ampM);
  pintarCarga(modeloCarga(spk, amp, resCarga, idiomaActual));

  if (fuente) {
    const fuenteM = fuenteDelCatalogo(fuente, idiomaActual);
    const resPuente = evaluarPuenteImpedancias(fuenteM, ampM);
    const resRecorrido = evaluarRecorridoVolumen(fuenteM, ampM);
    pintarGanancia(
      modeloPuente(fuente, amp, resPuente, idiomaActual),
      modeloRecorrido(fuente, amp, resRecorrido, idiomaActual)
    );
  } else {
    pintarGanancia(null, null);
  }

  pintarPlano(construirPlanoSvg(sala, disposicion, idiomaActual));
}

function analizar(): void {
  renderizarResultado();
  ir('results');
}

/** Cambia el idioma activo: guarda la preferencia, repinta el cromo
 * estático (data-i18n), reformatea lo que no es data-i18n (dimensiones,
 * "falta elegir…", tarjetas .info ya elegidas) y, si ya hay una cadena
 * completa, vuelve a calcular el resultado en el nuevo idioma sin
 * navegar — el usuario puede estar todavía en la pantalla de configurar. */
function cambiarIdioma(idioma: Idioma): void {
  if (idioma === idiomaActual) return;
  idiomaActual = idioma;
  guardarIdioma(idioma);
  aplicarCromoEstatico(idioma);
  actualizarTextosDimension();

  (['spk', 'amp', 'fuente'] as const).forEach((kind) => {
    const valor = estado[kind];
    const box = document.getElementById('info-' + kind);
    if (valor && box) box.innerHTML = infoHTML(kind, valor);
  });

  refrescar();
  renderizarResultado();
}

function inicializarSplash(): void {
  const ticks = document.getElementById('splash-ticks');
  if (!ticks) return;
  const alturas = [8, 12, 8, 16, 8, 12, 8, 22, 8, 12, 8, 16, 8, 12, 8];
  for (const h of alturas) {
    const i = document.createElement('i');
    i.style.height = h + 'px';
    ticks.appendChild(i);
  }
}

function wireEventos(): void {
  document.getElementById('btn-entrar')?.addEventListener('click', () => ir('config'));
  document.getElementById('btn-volver-splash')?.addEventListener('click', () => ir('splash'));
  document.getElementById('btn-volver-config')?.addEventListener('click', () => ir('config'));

  document.getElementById('sel-spk')?.addEventListener('change', (e) => pick('spk', (e.target as HTMLSelectElement).value));
  document.getElementById('sel-amp')?.addEventListener('change', (e) => pick('amp', (e.target as HTMLSelectElement).value));
  document.getElementById('sel-fuente')?.addEventListener('change', (e) => pick('fuente', (e.target as HTMLSelectElement).value));

  document.getElementById('in-W')?.addEventListener('input', (e) => setDim('W', parseFloat((e.target as HTMLInputElement).value)));
  document.getElementById('in-L')?.addEventListener('input', (e) => setDim('L', parseFloat((e.target as HTMLInputElement).value)));
  document.getElementById('in-H')?.addEventListener('input', (e) => setDim('H', parseFloat((e.target as HTMLInputElement).value)));

  document.querySelectorAll<HTMLButtonElement>('.segs button[data-lvl]').forEach((b) => {
    b.addEventListener('click', () => setNivel(b.dataset.lvl as NivelUI));
  });

  document.getElementById('btn-an')?.addEventListener('click', analizar);

  document.querySelectorAll<HTMLButtonElement>('[data-idioma]').forEach((b) => {
    b.addEventListener('click', () => cambiarIdioma(b.dataset.idioma as Idioma));
  });
}

function main(): void {
  inicializarSplash();
  poblarSelectores(idiomaActual);
  aplicarCromoEstatico(idiomaActual);
  wireEventos();

  const escala = document.getElementById('pw-scale');
  if (escala) construirEscala(escala);

  actualizarTextosDimension();
  refrescar();
}

main();
