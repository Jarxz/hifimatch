import './estilos.css';
import { CATALOGO } from '../../../packages/data/src/catalogo.ts';
import { calcularDisposicion } from '../../../packages/engine/src/sala.ts';
import type { Sala, DisposicionSala } from '../../../packages/engine/src/sala.ts';
import { evaluarPotencia, PICO_OBJETIVO_DB } from '../../../packages/engine/src/potencia.ts';
import { evaluarCarga } from '../../../packages/engine/src/carga.ts';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from '../../../packages/engine/src/ganancia.ts';
import type { ResultadoPuenteImpedancias, ResultadoRecorridoVolumen } from '../../../packages/engine/src/ganancia.ts';
import { evaluarModos } from '../../../packages/engine/src/modos.ts';
import { evaluarReverberacion } from '../../../packages/engine/src/reverberacion.ts';
import type { MaterialMuro, MaterialPiso, MaterialTecho } from '../../../packages/engine/src/reverberacion.ts';
import type { Genero } from '../../../packages/engine/src/genero.ts';
import { calcularPuntaje, peorSeveridad, PESOS_DECLARADOS } from '../../../packages/engine/src/puntaje.ts';
import type { NivelEscucha } from '../../../packages/engine/src/potencia.ts';
import type { Severidad } from '../../../packages/engine/src/tipos.ts';
import type { Idioma } from '../../../packages/data/src/idioma.ts';

import { estado } from './estado.ts';
import type { NivelUI } from './estado.ts';
import { ir } from './vista/pantallas.ts';
import { poblarSelectores, infoHtmlParlante, infoHtmlAmplificador, infoHtmlFuente } from './vista/selectores.ts';
import { construirEscala } from './vista/medidor.ts';
import { construirPlanoSvg } from './vista/plano.ts';
import type { MurosVista, Vista } from './vista/plano.ts';
import { construirCurvasModalesSvg } from './vista/curvamodal.ts';
import {
  modeloPotencia,
  modeloCarga,
  modeloPuente,
  modeloRecorrido,
  modeloModos,
  modeloReverberacion,
  modeloUbicacionParlantes,
  modeloPuntaje,
  modeloResumenFinal,
} from './vista/resultado.ts';
import type { ComponenteResumen } from './vista/resultado.ts';
import {
  pintarCadena,
  pintarSala,
  pintarPotencia,
  pintarCarga,
  pintarGanancia,
  pintarPlano,
  pintarModos,
  pintarCurvasModales,
  pintarReverberacion,
  pintarPuntaje,
  pintarResumenFinal,
} from './vista/pintar.ts';
import { parlanteDelCatalogo, amplificadorDelCatalogo, fuenteDelCatalogo } from './datos/adaptadores.ts';
import { especParlante, especAmplificador, especFuente } from './datos/etiquetas.ts';
import { num, numConSigno } from './formato/numeros.ts';
import { idiomaInicial, guardarIdioma, aplicarCromoEstatico, textosDe } from './idioma/idioma.ts';

const NIVEL_MOTOR: Record<NivelUI, NivelEscucha> = { mod: 'moderado', alto: 'alto', ref: 'referencia' };

let idiomaActual: Idioma = idiomaInicial();

/** Geometría del último análisis pintado — sólo para poder re-dibujar el
 * plano isométrico cuando el usuario cambia de vista (isométrica/frontal/
 * lateral/superior) sin recalcular ni renavegar. `null` antes del primer
 * "Analizar". */
let ultimoPlano: { sala: Sala; disposicion: DisposicionSala; murosVista: MurosVista } | null = null;

function repintarPlano(): void {
  if (!ultimoPlano) return;
  pintarPlano(construirPlanoSvg(ultimoPlano.sala, ultimoPlano.disposicion, ultimoPlano.murosVista, estado.vistaPlano, idiomaActual));
}

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
  const f = [...CATALOGO.streamers, ...CATALOGO.dacs].find((x) => x.id === id);
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

function infoHTML(kind: 'spk' | 'amp' | 'streamer' | 'dac', id: string): string {
  if (kind === 'spk') return infoHtmlParlante(buscarParlante(id), idiomaActual);
  if (kind === 'amp') return infoHtmlAmplificador(buscarAmplificador(id), idiomaActual);
  return infoHtmlFuente(buscarFuente(id), idiomaActual);
}

/**
 * Streamer y DAC son selectores independientes y opcionales, igual que
 * parlante/amplificador — el usuario puede elegir uno, otro, los dos o
 * ninguno. Cada uno evalúa su propio puente/recorrido contra el
 * amplificador (ver pintarGanancia), así que no hace falta exclusión mutua.
 */
function pick(kind: 'spk' | 'amp' | 'streamer' | 'dac', valor: string): void {
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

// Los 6 selectores de material son <select> nativos (menú desplegable, ver
// index.html #sel-murofrontal etc.) — el propio control ya muestra la
// selección actual, así que estos setters sólo actualizan el estado, sin
// el manejo de aria-pressed que sí necesitan los grupos de botones .segs.
function setMuroFrontal(muro: MaterialMuro): void {
  estado.muroFrontal = muro;
}
function setMuroPosterior(muro: MaterialMuro): void {
  estado.muroPosterior = muro;
}
function setMuroIzquierdo(muro: MaterialMuro): void {
  estado.muroIzquierdo = muro;
}
function setMuroDerecho(muro: MaterialMuro): void {
  estado.muroDerecho = muro;
}
function setPiso(piso: MaterialPiso): void {
  estado.piso = piso;
}
function setTecho(techo: MaterialTecho): void {
  estado.techo = techo;
}

function setGenero(genero: Genero): void {
  estado.genero = genero;
  document.querySelectorAll<HTMLButtonElement>('.segs button[data-genero]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.genero === genero));
  });
}

/** A diferencia de los demás `set*`, esto vive en la pantalla de resultado
 * (no en configurar): sólo cambia el ángulo de cámara del plano ya
 * calculado, así que repinta directo en vez de esperar un nuevo
 * "Analizar". */
function setVistaPlano(vista: Vista): void {
  estado.vistaPlano = vista;
  document.querySelectorAll<HTMLButtonElement>('.segs button[data-vista]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.vista === vista));
  });
  repintarPlano();
}

/** El núcleo de "Analizar": calcula y pinta las cuatro tarjetas de resultado
 * más el plano. Separado de analizar() para poder llamarlo de nuevo al
 * cambiar de idioma sin forzar la navegación a la pantalla de resultado. */
function renderizarResultado(): void {
  if (!estado.spk || !estado.amp) return;

  const spk = buscarParlante(estado.spk);
  const amp = buscarAmplificador(estado.amp);
  const streamer = estado.streamer ? buscarFuente(estado.streamer) : null;
  const dac = estado.dac ? buscarFuente(estado.dac) : null;

  const parlanteM = parlanteDelCatalogo(spk, idiomaActual);
  const ampM = amplificadorDelCatalogo(amp, idiomaActual);

  const { sala, disposicion } = disposicionActual();
  const t = textosDe(idiomaActual);
  const nivelTexto = nivelTextoDe(estado.lvl, idiomaActual);
  const picoObjetivo = PICO_OBJETIVO_DB[NIVEL_MOTOR[estado.lvl]];

  const resPot = evaluarPotencia(parlanteM, ampM, disposicion.distanciaEscuchaM, NIVEL_MOTOR[estado.lvl]);
  const mPot = modeloPotencia(spk, amp, resPot, disposicion.distanciaEscuchaM, nivelTexto, picoObjetivo, estado.genero, idiomaActual);
  pintarPotencia(mPot, idiomaActual);

  const resCarga = evaluarCarga(parlanteM, ampM);
  const mCarga = modeloCarga(spk, amp, resCarga, idiomaActual);
  pintarCarga(mCarga);

  let resPuenteStreamer: ResultadoPuenteImpedancias | null = null;
  let resRecorridoStreamer: ResultadoRecorridoVolumen | null = null;
  let mPuenteStreamer: ReturnType<typeof modeloPuente> | null = null;
  let mRecorridoStreamer: ReturnType<typeof modeloRecorrido> | null = null;
  if (streamer) {
    const streamerM = fuenteDelCatalogo(streamer, idiomaActual);
    resPuenteStreamer = evaluarPuenteImpedancias(streamerM, ampM);
    resRecorridoStreamer = evaluarRecorridoVolumen(streamerM, ampM);
    mPuenteStreamer = modeloPuente(streamer, amp, resPuenteStreamer, idiomaActual);
    mRecorridoStreamer = modeloRecorrido(streamer, amp, resRecorridoStreamer, idiomaActual);
    pintarGanancia('streamer', mPuenteStreamer, mRecorridoStreamer);
  } else {
    pintarGanancia('streamer', null, null);
  }

  let resPuenteDac: ResultadoPuenteImpedancias | null = null;
  let resRecorridoDac: ResultadoRecorridoVolumen | null = null;
  let mPuenteDac: ReturnType<typeof modeloPuente> | null = null;
  let mRecorridoDac: ReturnType<typeof modeloRecorrido> | null = null;
  if (dac) {
    const dacM = fuenteDelCatalogo(dac, idiomaActual);
    resPuenteDac = evaluarPuenteImpedancias(dacM, ampM);
    resRecorridoDac = evaluarRecorridoVolumen(dacM, ampM);
    mPuenteDac = modeloPuente(dac, amp, resPuenteDac, idiomaActual);
    mRecorridoDac = modeloRecorrido(dac, amp, resRecorridoDac, idiomaActual);
    pintarGanancia('dac', mPuenteDac, mRecorridoDac);
  } else {
    pintarGanancia('dac', null, null);
  }

  const materiales = {
    muroFrontal: estado.muroFrontal,
    muroPosterior: estado.muroPosterior,
    muroIzquierdo: estado.muroIzquierdo,
    muroDerecho: estado.muroDerecho,
    piso: estado.piso,
    techo: estado.techo,
  };
  const murosVista = {
    frontal: materiales.muroFrontal,
    posterior: materiales.muroPosterior,
    izquierdo: materiales.muroIzquierdo,
    derecho: materiales.muroDerecho,
  };
  ultimoPlano = { sala, disposicion, murosVista };
  repintarPlano();
  const resModos = evaluarModos(sala);
  const mModos = modeloModos(resModos, idiomaActual);
  pintarModos(mModos);
  pintarCurvasModales(construirCurvasModalesSvg(sala, resModos.agrupados, idiomaActual), t.motor.modos.curvasCaption);

  const resReverb = evaluarReverberacion(sala, materiales);
  const mReverb = modeloReverberacion(resReverb, materiales, idiomaActual);
  pintarReverberacion(mReverb);

  const murosVacios = (['muroFrontal', 'muroPosterior', 'muroIzquierdo', 'muroDerecho'] as const)
    .filter((k) => materiales[k] === 'vacio')
    .map((k) => t.config[k]);
  const avisoReverb = murosVacios.length > 0 ? t.motor.reverberacion.avisoVacio({ muros: murosVacios.join(', ') }) : null;

  const ubicacionEl = document.getElementById('plan-ubicacion');
  if (ubicacionEl) ubicacionEl.innerHTML = modeloUbicacionParlantes(disposicion, idiomaActual);

  const items = [
    { categoria: t.resultado.itemParlantes, nombre: spk.nombre, espec: especParlante(spk, idiomaActual), comentario: mCarga.verdictoTexto },
    { categoria: t.resultado.itemAmplificador, nombre: amp.nombre, espec: especAmplificador(amp, idiomaActual), comentario: mPot.verdictoTexto },
  ];
  if (streamer) {
    items.push({
      categoria: t.resultado.itemStreamer,
      nombre: streamer.nombre,
      espec: especFuente(streamer, idiomaActual),
      comentario: `${mPuenteStreamer!.verdictoTexto} · ${mRecorridoStreamer!.verdictoTexto}`,
    });
  }
  if (dac) {
    items.push({
      categoria: t.resultado.itemDac,
      nombre: dac.nombre,
      espec: especFuente(dac, idiomaActual),
      comentario: `${mPuenteDac!.verdictoTexto} · ${mRecorridoDac!.verdictoTexto}`,
    });
  }
  pintarCadena(items);

  pintarSala(
    `${num(sala.anchoM, 1, idiomaActual)} × ${num(sala.largoM, 1, idiomaActual)} m`,
    `${num(sala.altoM, 2, idiomaActual)} m`,
    `≈ ${num(disposicion.distanciaEscuchaM, 1, idiomaActual)} m`,
    nivelTexto,
    `${num(picoObjetivo, 0, idiomaActual)} dB`
  );

  const puntaje = calcularPuntaje([
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: resPot.severidad },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: resCarga.severidad },
    { nombre: 'puente', peso: PESOS_DECLARADOS.puente, severidad: severidadCombinada(resPuenteStreamer, resPuenteDac) },
    { nombre: 'recorrido', peso: PESOS_DECLARADOS.recorrido, severidad: severidadCombinada(resRecorridoStreamer, resRecorridoDac) },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: resModos.severidad },
  ]);
  pintarPuntaje(modeloPuntaje(puntaje, idiomaActual));

  const nombreComponente = t.motor.puntaje.componente;
  const componentesResumen: ComponenteResumen[] = [
    {
      nombre: nombreComponente.potencia,
      verdictoClase: mPot.verdictoClase,
      verdictoTexto: mPot.verdictoTexto,
      detalle: `${numConSigno(resPot.margenDb, 1, idiomaActual)} dB`,
      avisoHtml: mPot.avisoHtml,
    },
    { nombre: nombreComponente.carga, verdictoClase: mCarga.verdictoClase, verdictoTexto: mCarga.verdictoTexto, avisoHtml: mCarga.avisoHtml },
    { nombre: nombreComponente.modos, verdictoClase: mModos.verdictoClase, verdictoTexto: mModos.verdictoTexto, avisoHtml: mModos.sugerenciaHtml },
    {
      nombre: t.motor.reverberacion.nombreCorto,
      verdictoClase: mReverb.verdictoClase,
      verdictoTexto: mReverb.verdictoTexto,
      avisoHtml: avisoReverb,
    },
  ];
  if (mPuenteStreamer && resPuenteStreamer) {
    componentesResumen.push({
      nombre: `${nombreComponente.puente} (${t.config.streamer})`,
      verdictoClase: mPuenteStreamer.verdictoClase,
      verdictoTexto: mPuenteStreamer.verdictoTexto,
      detalle: resPuenteStreamer.ratioZ !== null ? `ratioZ ${num(resPuenteStreamer.ratioZ, 1, idiomaActual)}×` : undefined,
      avisoHtml: mPuenteStreamer.avisoHtml,
    });
  }
  if (mRecorridoStreamer && resRecorridoStreamer) {
    componentesResumen.push({
      nombre: `${nombreComponente.recorrido} (${t.config.streamer})`,
      verdictoClase: mRecorridoStreamer.verdictoClase,
      verdictoTexto: mRecorridoStreamer.verdictoTexto,
      detalle: resRecorridoStreamer.margenV !== null ? `${num(resRecorridoStreamer.margenV, 1, idiomaActual)}×` : undefined,
      avisoHtml: mRecorridoStreamer.avisoHtml,
    });
  }
  if (mPuenteDac && resPuenteDac) {
    componentesResumen.push({
      nombre: `${nombreComponente.puente} (${t.config.dac})`,
      verdictoClase: mPuenteDac.verdictoClase,
      verdictoTexto: mPuenteDac.verdictoTexto,
      detalle: resPuenteDac.ratioZ !== null ? `ratioZ ${num(resPuenteDac.ratioZ, 1, idiomaActual)}×` : undefined,
      avisoHtml: mPuenteDac.avisoHtml,
    });
  }
  if (mRecorridoDac && resRecorridoDac) {
    componentesResumen.push({
      nombre: `${nombreComponente.recorrido} (${t.config.dac})`,
      verdictoClase: mRecorridoDac.verdictoClase,
      verdictoTexto: mRecorridoDac.verdictoTexto,
      detalle: resRecorridoDac.margenV !== null ? `${num(resRecorridoDac.margenV, 1, idiomaActual)}×` : undefined,
      avisoHtml: mRecorridoDac.avisoHtml,
    });
  }
  pintarResumenFinal(modeloResumenFinal(componentesResumen, { valor: puntaje.puntaje, clase: puntaje.clase }, idiomaActual));
}

/**
 * Combina hasta dos resultados opcionales (streamer y dac) en una sola
 * severidad para el puntaje: si ninguno está elegido, el componente no
 * aplica (null); si alguno tiene una severidad real (no "sin-datos"), se
 * usa la peor de las reales; si los elegidos están todos en "sin-datos",
 * el componente entero queda "sin-datos" — nunca se inventa un valor.
 */
function severidadCombinada(...resultados: Array<{ severidad: Severidad } | null>): Severidad | null {
  const elegidos = resultados.filter((r): r is { severidad: Severidad } => r !== null);
  if (elegidos.length === 0) return null;
  const reales = elegidos.map((r) => r.severidad).filter((s): s is Exclude<Severidad, 'sin-datos'> => s !== 'sin-datos');
  if (reales.length === 0) return 'sin-datos';
  return peorSeveridad(...reales);
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

  (['spk', 'amp', 'streamer', 'dac'] as const).forEach((kind) => {
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
  document.getElementById('btn-info')?.addEventListener('click', () => ir('info'));
  document.getElementById('btn-info-volver')?.addEventListener('click', () => ir('results'));
  document.getElementById('btn-info-volver-2')?.addEventListener('click', () => ir('results'));

  document.getElementById('sel-spk')?.addEventListener('change', (e) => pick('spk', (e.target as HTMLSelectElement).value));
  document.getElementById('sel-amp')?.addEventListener('change', (e) => pick('amp', (e.target as HTMLSelectElement).value));
  document.getElementById('sel-streamer')?.addEventListener('change', (e) => pick('streamer', (e.target as HTMLSelectElement).value));
  document.getElementById('sel-dac')?.addEventListener('change', (e) => pick('dac', (e.target as HTMLSelectElement).value));

  document.getElementById('in-W')?.addEventListener('input', (e) => setDim('W', parseFloat((e.target as HTMLInputElement).value)));
  document.getElementById('in-L')?.addEventListener('input', (e) => setDim('L', parseFloat((e.target as HTMLInputElement).value)));
  document.getElementById('in-H')?.addEventListener('input', (e) => setDim('H', parseFloat((e.target as HTMLInputElement).value)));

  document.querySelectorAll<HTMLButtonElement>('.segs button[data-lvl]').forEach((b) => {
    b.addEventListener('click', () => setNivel(b.dataset.lvl as NivelUI));
  });

  document.getElementById('sel-murofrontal')?.addEventListener('change', (e) => setMuroFrontal((e.target as HTMLSelectElement).value as MaterialMuro));
  document.getElementById('sel-muroposterior')?.addEventListener('change', (e) => setMuroPosterior((e.target as HTMLSelectElement).value as MaterialMuro));
  document.getElementById('sel-muroizquierdo')?.addEventListener('change', (e) => setMuroIzquierdo((e.target as HTMLSelectElement).value as MaterialMuro));
  document.getElementById('sel-muroderecho')?.addEventListener('change', (e) => setMuroDerecho((e.target as HTMLSelectElement).value as MaterialMuro));
  document.getElementById('sel-piso')?.addEventListener('change', (e) => setPiso((e.target as HTMLSelectElement).value as MaterialPiso));
  document.getElementById('sel-techo')?.addEventListener('change', (e) => setTecho((e.target as HTMLSelectElement).value as MaterialTecho));

  document.querySelectorAll<HTMLButtonElement>('.segs button[data-genero]').forEach((b) => {
    b.addEventListener('click', () => setGenero(b.dataset.genero as Genero));
  });

  document.querySelectorAll<HTMLButtonElement>('.segs button[data-vista]').forEach((b) => {
    b.addEventListener('click', () => setVistaPlano(b.dataset.vista as Vista));
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
