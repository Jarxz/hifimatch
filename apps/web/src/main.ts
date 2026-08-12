import './estilos.css';
import { CATALOGO } from '../../../packages/data/src/catalogo.ts';
import { calcularDisposicion } from '../../../packages/engine/src/sala.ts';
import { evaluarPotencia, PICO_OBJETIVO_DB } from '../../../packages/engine/src/potencia.ts';
import { evaluarCarga } from '../../../packages/engine/src/carga.ts';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from '../../../packages/engine/src/ganancia.ts';
import type { NivelEscucha } from '../../../packages/engine/src/potencia.ts';

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
import { IDIOMA_PROVISIONAL as IDIOMA } from './idioma-provisional.ts';

const NIVEL_TEXTO: Record<NivelUI, string> = { mod: 'Moderado', alto: 'Alto', ref: 'Referencia' };
const NIVEL_MOTOR: Record<NivelUI, NivelEscucha> = { mod: 'moderado', alto: 'alto', ref: 'referencia' };

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

function refrescar(): void {
  const { disposicion } = disposicionActual();
  const vDist = document.getElementById('v-dist');
  const vVol = document.getElementById('v-vol');
  if (vDist) vDist.textContent = num(disposicion.distanciaEscuchaM, 1, IDIOMA) + ' m';
  if (vVol) vVol.textContent = num(disposicion.volumenM3, 0, IDIOMA) + ' m³';

  const ok = estado.spk !== null && estado.amp !== null;
  const btn = document.getElementById('btn-an') as HTMLButtonElement | null;
  if (btn) btn.disabled = !ok;

  const miss = document.getElementById('miss');
  if (miss) {
    const faltantes = [!estado.spk ? 'parlantes' : null, !estado.amp ? 'amplificador' : null].filter(
      (x): x is string => x !== null
    );
    miss.textContent = ok ? '' : 'Falta elegir ' + faltantes.join(' y ');
  }
}

function infoHTML(kind: 'spk' | 'amp' | 'fuente', id: string): string {
  if (kind === 'spk') return infoHtmlParlante(buscarParlante(id));
  if (kind === 'amp') return infoHtmlAmplificador(buscarAmplificador(id));
  return infoHtmlFuente(buscarFuente(id));
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
  const decimales = dim === 'H' ? 2 : 1;
  const el = document.getElementById('v-' + dim);
  if (el) el.textContent = num(valor, decimales, IDIOMA) + ' m';
  refrescar();
}

function setNivel(lvl: NivelUI): void {
  estado.lvl = lvl;
  document.querySelectorAll<HTMLButtonElement>('.segs button[data-lvl]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lvl === lvl));
  });
}

function analizar(): void {
  if (!estado.spk || !estado.amp) return;

  const spk = buscarParlante(estado.spk);
  const amp = buscarAmplificador(estado.amp);
  const fuente = estado.fuente ? buscarFuente(estado.fuente) : null;

  const parlanteM = parlanteDelCatalogo(spk, IDIOMA);
  const ampM = amplificadorDelCatalogo(amp, IDIOMA);

  const { sala, disposicion } = disposicionActual();
  const nivelTexto = NIVEL_TEXTO[estado.lvl];
  const picoObjetivo = PICO_OBJETIVO_DB[NIVEL_MOTOR[estado.lvl]];

  const items = [{ categoria: 'Parlantes', nombre: spk.nombre, espec: especParlante(spk) }, { categoria: 'Amplificador', nombre: amp.nombre, espec: especAmplificador(amp) }];
  if (fuente) items.push({ categoria: 'Fuente', nombre: fuente.nombre, espec: especFuente(fuente) });
  pintarCadena(items);

  pintarSala(
    `${num(sala.anchoM, 1, IDIOMA)} × ${num(sala.largoM, 1, IDIOMA)} m`,
    `${num(sala.altoM, 2, IDIOMA)} m`,
    `≈ ${num(disposicion.distanciaEscuchaM, 1, IDIOMA)} m`,
    nivelTexto,
    `${num(picoObjetivo, 0, IDIOMA)} dB`
  );

  const resPot = evaluarPotencia(parlanteM, ampM, disposicion.distanciaEscuchaM, NIVEL_MOTOR[estado.lvl]);
  pintarPotencia(modeloPotencia(spk, amp, resPot, disposicion.distanciaEscuchaM, nivelTexto, picoObjetivo));

  const resCarga = evaluarCarga(parlanteM, ampM);
  pintarCarga(modeloCarga(spk, amp, resCarga));

  if (fuente) {
    const fuenteM = fuenteDelCatalogo(fuente, IDIOMA);
    const resPuente = evaluarPuenteImpedancias(fuenteM, ampM);
    const resRecorrido = evaluarRecorridoVolumen(fuenteM, ampM);
    pintarGanancia(modeloPuente(fuente, amp, resPuente), modeloRecorrido(fuente, amp, resRecorrido));
  } else {
    pintarGanancia(null, null);
  }

  pintarPlano(construirPlanoSvg(sala, disposicion));

  ir('results');
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
}

function main(): void {
  inicializarSplash();
  poblarSelectores();
  wireEventos();

  const escala = document.getElementById('pw-scale');
  if (escala) construirEscala(escala);

  refrescar();
}

main();
