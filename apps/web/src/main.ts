import './estilos.css';
import { CATALOGO } from '../../../packages/data/src/catalogo.ts';
import { calcularDisposicion, calcularDisposicionManual } from '../../../packages/engine/src/sala.ts';
import type { Sala, DisposicionSala, Punto } from '../../../packages/engine/src/sala.ts';
import { evaluarPotencia, PICO_OBJETIVO_DB } from '../../../packages/engine/src/potencia.ts';
import { evaluarCarga } from '../../../packages/engine/src/carga.ts';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from '../../../packages/engine/src/ganancia.ts';
import type { ResultadoPuenteImpedancias, ResultadoRecorridoVolumen } from '../../../packages/engine/src/ganancia.ts';
import { evaluarModos } from '../../../packages/engine/src/modos.ts';
import { evaluarReverberacion } from '../../../packages/engine/src/reverberacion.ts';
import type { MaterialMuro, MaterialPiso, MaterialTecho } from '../../../packages/engine/src/reverberacion.ts';
import type { Genero } from '../../../packages/engine/src/genero.ts';
import { calcularPuntaje, PESOS_DECLARADOS } from '../../../packages/engine/src/puntaje.ts';
import type { ComponentePuntaje } from '../../../packages/engine/src/puntaje.ts';
import type { NivelEscucha } from '../../../packages/engine/src/potencia.ts';
import type { Idioma } from '../../../packages/data/src/idioma.ts';
import { validarContacto } from '../../../packages/contact/src/contacto.ts';
import type { EntradaContacto } from '../../../packages/contact/src/contacto.ts';

import { estado } from './estado.ts';
import type { NivelUI } from './estado.ts';
import { ir } from './vista/pantallas.ts';
import { poblarSelectores, poblarModelos, vaciarModelos, infoHtmlParlante, infoHtmlAmplificador, infoHtmlFuente } from './vista/selectores.ts';
import { construirEscala } from './vista/medidor.ts';
import { construirPlanoSvg } from './vista/plano.ts';
import type { MurosVista, Vista } from './vista/plano.ts';
import { activarArrastre } from './vista/arrastre.ts';
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

/**
 * Parte del análisis que NO depende de la posición de los parlantes —
 * carga, puente/recorrido de ganancia, modos y reverberación sólo miran la
 * sala y el equipo elegido, nunca la disposición (confirmado leyendo
 * potencia.ts/modos.ts/reverberacion.ts: sólo evaluarPotencia recibe una
 * distancia). Se calcula una sola vez por "Analizar" y viven acá, en vez
 * de duplicarse entre la pestaña "Análisis original" y "Modificado".
 */
interface UltimoAnalisis {
  sala: Sala;
  spk: ReturnType<typeof buscarParlante>;
  amp: ReturnType<typeof buscarAmplificador>;
  parlanteM: ReturnType<typeof parlanteDelCatalogo>;
  ampM: ReturnType<typeof amplificadorDelCatalogo>;
  streamer: ReturnType<typeof buscarFuente> | null;
  dac: ReturnType<typeof buscarFuente> | null;
  resCarga: ReturnType<typeof evaluarCarga>;
  mCarga: ReturnType<typeof modeloCarga>;
  resPuenteStreamer: ResultadoPuenteImpedancias | null;
  mPuenteStreamer: ReturnType<typeof modeloPuente> | null;
  resRecorridoStreamer: ResultadoRecorridoVolumen | null;
  mRecorridoStreamer: ReturnType<typeof modeloRecorrido> | null;
  resPuenteDac: ResultadoPuenteImpedancias | null;
  mPuenteDac: ReturnType<typeof modeloPuente> | null;
  resRecorridoDac: ResultadoRecorridoVolumen | null;
  mRecorridoDac: ReturnType<typeof modeloRecorrido> | null;
  resModos: ReturnType<typeof evaluarModos>;
  mModos: ReturnType<typeof modeloModos>;
  resReverb: ReturnType<typeof evaluarReverberacion>;
  mReverb: ReturnType<typeof modeloReverberacion>;
  avisoReverb: string | null;
  murosVista: MurosVista;
  nivelTexto: string;
  picoObjetivo: number;
}

/** Parte del análisis que sí depende de la posición de los parlantes —
 * una por pestaña ("Análisis original" / "Modificado"). */
interface SnapshotAnalisis {
  disposicion: DisposicionSala;
  resPot: ReturnType<typeof evaluarPotencia>;
  mPot: ReturnType<typeof modeloPotencia>;
  puntaje: ReturnType<typeof calcularPuntaje>;
  mPuntaje: ReturnType<typeof modeloPuntaje>;
  componentesResumen: ComponenteResumen[];
}

let ultimoAnalisis: UltimoAnalisis | null = null;
let analisisOriginal: SnapshotAnalisis | null = null; // se fija una vez por "Analizar", nunca se pisa
let analisisModificado: SnapshotAnalisis | null = null; // null hasta el primer "Recalcular"; se reemplaza en cada uno siguiente
let pestanaActiva: 'original' | 'modificado' = 'original';
/** Posición "en curso" del arrastre — independiente de qué pestaña está
 * activa; "Recalcular" congela esto en un snapshot nuevo. */
let disposicionManual: { parlanteIzq: Punto; parlanteDer: Punto } | null = null;

/** Geometría del último análisis pintado — sólo para poder re-dibujar el
 * plano isométrico cuando el usuario cambia de vista (isométrica/frontal/
 * lateral/superior) o arrastra un parlante, sin recalcular potencia ni
 * puntaje. `null` antes del primer "Analizar". */
let ultimoPlano: { sala: Sala; disposicion: DisposicionSala; murosVista: MurosVista } | null = null;

function repintarPlano(): void {
  if (!ultimoPlano) return;
  const editable = estado.vistaPlano === 'superior';
  pintarPlano(construirPlanoSvg(ultimoPlano.sala, ultimoPlano.disposicion, ultimoPlano.murosVista, estado.vistaPlano, idiomaActual, editable));
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

/** Geometría de sala derivada del estado actual — delega en el motor real.
 * Sólo se usa en la pantalla de configurar (antes de "Analizar"), donde
 * todavía no hay disposición manual posible: el arrastre sólo existe en el
 * plano de la pantalla de resultado. */
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

/** Cambiar de marca (o volver al placeholder) siempre limpia el modelo
 * elegido — no tiene sentido dejar seleccionado un modelo de otra marca
 * mientras se repuebla el <select> de modelo. `pick(kind, '')` reusa
 * exactamente la misma limpieza de estado/tarjeta .info que ya usa el
 * <select> de modelo al volver a su placeholder. */
function setMarca(kind: 'spk' | 'amp' | 'streamer' | 'dac', marca: string): void {
  document.getElementById('sel-' + kind + '-marca')?.classList.toggle('empty', !marca);
  if (marca) poblarModelos(kind, marca, idiomaActual);
  else vaciarModelos(kind, idiomaActual);
  pick(kind, '');
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
 * "Analizar". El hint de arrastre y los agarres editables (vía
 * `repintarPlano`) sólo aparecen en la vista Superior. */
function setVistaPlano(vista: Vista): void {
  estado.vistaPlano = vista;
  document.querySelectorAll<HTMLButtonElement>('.segs button[data-vista]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.vista === vista));
  });
  const hint = document.getElementById('plan-hint');
  if (hint) hint.classList.toggle('hidden', vista !== 'superior');
  repintarPlano();
}

/** Arma el snapshot completo (potencia + puntaje + resumen) de UNA
 * disposición de parlantes, reusando la parte compartida ya calculada en
 * `ultimoAnalisis` — no recalcula carga/puente/recorrido/modos/
 * reverberación, sólo lo que sí depende de dónde están los parlantes. */
function construirSnapshot(a: UltimoAnalisis, disposicion: DisposicionSala): SnapshotAnalisis {
  const resPot = evaluarPotencia(a.parlanteM, a.ampM, disposicion.distanciaEscuchaM, NIVEL_MOTOR[estado.lvl]);
  const mPot = modeloPotencia(a.spk, a.amp, resPot, disposicion.distanciaEscuchaM, a.nivelTexto, a.picoObjetivo, estado.genero, idiomaActual);

  const componentesPuntaje: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: resPot.severidad },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: a.resCarga.severidad },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: a.resModos.severidad },
    { nombre: 'reverberacion', peso: PESOS_DECLARADOS.reverberacion, severidad: a.resReverb.severidad },
  ];
  if (a.streamer) {
    componentesPuntaje.push(
      { nombre: 'puenteStreamer', peso: PESOS_DECLARADOS.puenteStreamer, severidad: a.resPuenteStreamer!.severidad },
      { nombre: 'recorridoStreamer', peso: PESOS_DECLARADOS.recorridoStreamer, severidad: a.resRecorridoStreamer!.severidad }
    );
  }
  if (a.dac) {
    componentesPuntaje.push(
      { nombre: 'puenteDac', peso: PESOS_DECLARADOS.puenteDac, severidad: a.resPuenteDac!.severidad },
      { nombre: 'recorridoDac', peso: PESOS_DECLARADOS.recorridoDac, severidad: a.resRecorridoDac!.severidad }
    );
  }
  const puntaje = calcularPuntaje(componentesPuntaje);
  const mPuntaje = modeloPuntaje(puntaje, idiomaActual);

  const t = textosDe(idiomaActual);
  const nombreComponente = t.motor.puntaje.componente;
  const componentesResumen: ComponenteResumen[] = [
    {
      nombre: nombreComponente.potencia,
      verdictoClase: mPot.verdictoClase,
      verdictoTexto: mPot.verdictoTexto,
      detalle: `${numConSigno(resPot.margenDb, 1, idiomaActual)} dB`,
      avisoHtml: mPot.avisoHtml,
    },
    { nombre: nombreComponente.carga, verdictoClase: a.mCarga.verdictoClase, verdictoTexto: a.mCarga.verdictoTexto, avisoHtml: a.mCarga.avisoHtml },
    { nombre: nombreComponente.modos, verdictoClase: a.mModos.verdictoClase, verdictoTexto: a.mModos.verdictoTexto, avisoHtml: a.mModos.sugerenciaHtml },
    {
      nombre: t.motor.reverberacion.nombreCorto,
      verdictoClase: a.mReverb.verdictoClase,
      verdictoTexto: a.mReverb.verdictoTexto,
      avisoHtml: a.avisoReverb,
    },
  ];
  if (a.mPuenteStreamer && a.resPuenteStreamer) {
    componentesResumen.push({
      nombre: nombreComponente.puenteStreamer,
      verdictoClase: a.mPuenteStreamer.verdictoClase,
      verdictoTexto: a.mPuenteStreamer.verdictoTexto,
      detalle: a.resPuenteStreamer.ratioZ !== null ? `ratioZ ${num(a.resPuenteStreamer.ratioZ, 1, idiomaActual)}×` : undefined,
      avisoHtml: a.mPuenteStreamer.avisoHtml,
    });
  }
  if (a.mRecorridoStreamer && a.resRecorridoStreamer) {
    componentesResumen.push({
      nombre: nombreComponente.recorridoStreamer,
      verdictoClase: a.mRecorridoStreamer.verdictoClase,
      verdictoTexto: a.mRecorridoStreamer.verdictoTexto,
      detalle: a.resRecorridoStreamer.margenV !== null ? `${num(a.resRecorridoStreamer.margenV, 1, idiomaActual)}×` : undefined,
      avisoHtml: a.mRecorridoStreamer.avisoHtml,
    });
  }
  if (a.mPuenteDac && a.resPuenteDac) {
    componentesResumen.push({
      nombre: nombreComponente.puenteDac,
      verdictoClase: a.mPuenteDac.verdictoClase,
      verdictoTexto: a.mPuenteDac.verdictoTexto,
      detalle: a.resPuenteDac.ratioZ !== null ? `ratioZ ${num(a.resPuenteDac.ratioZ, 1, idiomaActual)}×` : undefined,
      avisoHtml: a.mPuenteDac.avisoHtml,
    });
  }
  if (a.mRecorridoDac && a.resRecorridoDac) {
    componentesResumen.push({
      nombre: nombreComponente.recorridoDac,
      verdictoClase: a.mRecorridoDac.verdictoClase,
      verdictoTexto: a.mRecorridoDac.verdictoTexto,
      detalle: a.resRecorridoDac.margenV !== null ? `${num(a.resRecorridoDac.margenV, 1, idiomaActual)}×` : undefined,
      avisoHtml: a.mRecorridoDac.avisoHtml,
    });
  }

  return { disposicion, resPot, mPot, puntaje, mPuntaje, componentesResumen };
}

/** Pinta un snapshot completo — potencia, "La cadena", "Sala", puntaje,
 * "En resumen" y el plano — reusando la parte compartida de
 * `ultimoAnalisis`. Un solo lugar sabe pintar "el resultado de una
 * disposición dada", tanto para el primer "Analizar" como para cada
 * cambio de pestaña o "Recalcular" — nada de esto recalcula el motor, sólo
 * asigna al DOM lo que el snapshot ya trae calculado. */
function pintarSnapshot(a: UltimoAnalisis, snap: SnapshotAnalisis): void {
  pintarPotencia(snap.mPot, idiomaActual);

  const t = textosDe(idiomaActual);
  const items = [
    { categoria: t.resultado.itemParlantes, nombre: a.spk.nombre, espec: especParlante(a.spk, idiomaActual), comentario: a.mCarga.verdictoTexto },
    { categoria: t.resultado.itemAmplificador, nombre: a.amp.nombre, espec: especAmplificador(a.amp, idiomaActual), comentario: snap.mPot.verdictoTexto },
  ];
  if (a.streamer) {
    items.push({
      categoria: t.resultado.itemStreamer,
      nombre: a.streamer.nombre,
      espec: especFuente(a.streamer, idiomaActual),
      comentario: `${a.mPuenteStreamer!.verdictoTexto} · ${a.mRecorridoStreamer!.verdictoTexto}`,
    });
  }
  if (a.dac) {
    items.push({
      categoria: t.resultado.itemDac,
      nombre: a.dac.nombre,
      espec: especFuente(a.dac, idiomaActual),
      comentario: `${a.mPuenteDac!.verdictoTexto} · ${a.mRecorridoDac!.verdictoTexto}`,
    });
  }
  pintarCadena(items);

  pintarSala(
    `${num(a.sala.anchoM, 1, idiomaActual)} × ${num(a.sala.largoM, 1, idiomaActual)} m`,
    `${num(a.sala.altoM, 2, idiomaActual)} m`,
    `≈ ${num(snap.disposicion.distanciaEscuchaM, 1, idiomaActual)} m`,
    a.nivelTexto,
    `${num(a.picoObjetivo, 0, idiomaActual)} dB`
  );

  pintarPuntaje(snap.mPuntaje);
  pintarResumenFinal(modeloResumenFinal(snap.componentesResumen, { valor: snap.puntaje.puntaje, clase: snap.puntaje.clase }, idiomaActual));

  ultimoPlano = { sala: a.sala, disposicion: snap.disposicion, murosVista: a.murosVista };
  repintarPlano();
  const ubicacionEl = document.getElementById('plan-ubicacion');
  if (ubicacionEl) ubicacionEl.innerHTML = modeloUbicacionParlantes(a.sala, snap.disposicion, idiomaActual);
}

/** Vista previa liviana durante el arrastre: sólo redibuja el plano y el
 * párrafo de ubicación con la disposición nueva — no toca potencia,
 * puntaje ni "En resumen" (eso sólo pasa al confirmar con "Recalcular"). */
function previsualizarDisposicion(disposicion: DisposicionSala): void {
  if (!ultimoAnalisis || !ultimoPlano) return;
  ultimoPlano = { ...ultimoPlano, disposicion };
  repintarPlano();
  const ubicacionEl = document.getElementById('plan-ubicacion');
  if (ubicacionEl) ubicacionEl.innerHTML = modeloUbicacionParlantes(ultimoAnalisis.sala, disposicion, idiomaActual);
}

/** Posición de partida para un gesto de arrastre: la última posición
 * "en curso" si ya se movió algo desde el último "Analizar"/cambio de
 * pestaña, o si no, la de la pestaña actualmente activa. */
function posicionBaseParaArrastre(): { parlanteIzq: Punto; parlanteDer: Punto } | null {
  if (disposicionManual) return disposicionManual;
  const snap = pestanaActiva === 'original' ? analisisOriginal : analisisModificado;
  return snap ? { parlanteIzq: snap.disposicion.parlanteIzq, parlanteDer: snap.disposicion.parlanteDer } : null;
}

function onMoverParlante(lado: 'izq' | 'der', puntoM: Punto): void {
  if (!ultimoAnalisis) return;
  const base = posicionBaseParaArrastre();
  if (!base) return;
  disposicionManual = lado === 'izq' ? { parlanteIzq: puntoM, parlanteDer: base.parlanteDer } : { parlanteIzq: base.parlanteIzq, parlanteDer: puntoM };
  previsualizarDisposicion(calcularDisposicionManual(ultimoAnalisis.sala, disposicionManual.parlanteIzq, disposicionManual.parlanteDer));
}

function mostrarPestanaModificado(): void {
  document.querySelector('[data-pestana="modificado"]')?.classList.remove('hidden');
}

/** Cambia de pestaña repintando el snapshot ya calculado — nunca recalcula
 * el motor. También retoma el arrastre desde donde quedó esa pestaña, no
 * desde una posición vieja de otra pestaña. */
function activarPestana(pestana: 'original' | 'modificado'): void {
  const snap = pestana === 'original' ? analisisOriginal : analisisModificado;
  if (!snap || !ultimoAnalisis) return;
  pestanaActiva = pestana;
  pintarSnapshot(ultimoAnalisis, snap);
  disposicionManual = { parlanteIzq: snap.disposicion.parlanteIzq, parlanteDer: snap.disposicion.parlanteDer };
  document.querySelectorAll<HTMLButtonElement>('[data-pestana]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.pestana === pestana));
  });
}

/** "Recalcular": congela la posición actual del arrastre en un snapshot
 * completo y lo publica como la pestaña "Modificado" — la crea la primera
 * vez, reemplaza su contenido las veces siguientes (nunca hay una tercera
 * pestaña). La pestaña "Análisis original" nunca se toca. */
function recalcular(): void {
  if (!disposicionManual || !ultimoAnalisis) return;
  const disposicion = calcularDisposicionManual(ultimoAnalisis.sala, disposicionManual.parlanteIzq, disposicionManual.parlanteDer);
  analisisModificado = construirSnapshot(ultimoAnalisis, disposicion);
  mostrarPestanaModificado();
  activarPestana('modificado');
}

/** El núcleo de "Analizar": calcula la parte compartida del análisis, la
 * disposición automática como pestaña "Análisis original", y resetea
 * cualquier pestaña "Modificado" previa — un "Analizar" nuevo siempre
 * vuelve a partir de cero. Separado de analizar() para poder llamarlo de
 * nuevo al cambiar de idioma sin forzar la navegación a esa pantalla. */
function renderizarResultado(): void {
  if (!estado.spk || !estado.amp) return;

  const spk = buscarParlante(estado.spk);
  const amp = buscarAmplificador(estado.amp);
  const streamer = estado.streamer ? buscarFuente(estado.streamer) : null;
  const dac = estado.dac ? buscarFuente(estado.dac) : null;

  const parlanteM = parlanteDelCatalogo(spk, idiomaActual);
  const ampM = amplificadorDelCatalogo(amp, idiomaActual);

  const sala: Sala = { anchoM: estado.W, largoM: estado.L, altoM: estado.H };
  const t = textosDe(idiomaActual);
  const nivelTexto = nivelTextoDe(estado.lvl, idiomaActual);
  const picoObjetivo = PICO_OBJETIVO_DB[NIVEL_MOTOR[estado.lvl]];

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
  const murosVista: MurosVista = {
    frontal: materiales.muroFrontal,
    posterior: materiales.muroPosterior,
    izquierdo: materiales.muroIzquierdo,
    derecho: materiales.muroDerecho,
  };

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

  ultimoAnalisis = {
    sala,
    spk,
    amp,
    parlanteM,
    ampM,
    streamer,
    dac,
    resCarga,
    mCarga,
    resPuenteStreamer,
    mPuenteStreamer,
    resRecorridoStreamer,
    mRecorridoStreamer,
    resPuenteDac,
    mPuenteDac,
    resRecorridoDac,
    mRecorridoDac,
    resModos,
    mModos,
    resReverb,
    mReverb,
    avisoReverb,
    murosVista,
    nivelTexto,
    picoObjetivo,
  };

  analisisOriginal = construirSnapshot(ultimoAnalisis, calcularDisposicion(sala));
  analisisModificado = null;
  disposicionManual = null;
  pestanaActiva = 'original';
  document.querySelector('[data-pestana="original"]')?.setAttribute('aria-pressed', 'true');
  const pestanaModEl = document.querySelector('[data-pestana="modificado"]');
  pestanaModEl?.setAttribute('aria-pressed', 'false');
  pestanaModEl?.classList.add('hidden');

  pintarSnapshot(ultimoAnalisis, analisisOriginal);
}

function analizar(): void {
  renderizarResultado();
  ir('results');
}

/** Cambia el idioma activo: guarda la preferencia, repinta el cromo
 * estático (data-i18n), reformatea lo que no es data-i18n (dimensiones,
 * "falta elegir…", tarjetas .info ya elegidas) y, si ya hay una cadena
 * completa, vuelve a calcular el resultado en el nuevo idioma sin
 * navegar — el usuario puede estar todavía en la pantalla de configurar.
 * Esto reinicia a la pestaña "Análisis original" igual que un "Analizar"
 * nuevo — es el mismo recálculo completo, sólo disparado por otro gatillo. */
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

type InfoClave = 'capas' | 'confianza' | 'potencia' | 'carga' | 'ganancia' | 'modos' | 'reverberacion' | 'plano' | 'puntaje';

function abrirPopup(titulo: string, cuerpoHtml: string): void {
  const dialog = document.getElementById('info-popup') as HTMLDialogElement | null;
  const tituloEl = document.getElementById('info-popup-titulo');
  const cuerpoEl = document.getElementById('info-popup-cuerpo');
  if (!dialog || !tituloEl || !cuerpoEl) return;
  tituloEl.textContent = titulo;
  cuerpoEl.innerHTML = cuerpoHtml;
  dialog.showModal();
}

/** Popup con la misma explicación de la pantalla "Guía del análisis"
 * (`info.*`), abierta desde el botón "i" de cada tarjeta — atajo
 * contextual, no reemplaza la guía completa (que además cubre capas y
 * confianza, sin tarjeta propia a la que atarse). */
function abrirInfoPopup(clave: InfoClave): void {
  const info = textosDe(idiomaActual).info[clave];
  abrirPopup(info.titulo, info.cuerpoHtml);
}

/** "Guardar" queda diferido (necesita backend/auth) — el botón sólo
 * declara la limitación, mismo patrón que "Ficha del producto ·
 * próximamente". */
function abrirGuardarPopup(): void {
  const t = textosDe(idiomaActual).resultado;
  abrirPopup(t.guardarPopupTitulo, t.guardarPopupCuerpo);
}

/** Destino del enlace `mailto:` de respaldo cuando el sitio corre por
 * `file://` (ahí no se puede llamar a `/api/contact` — ni siquiera resuelve
 * a un host). Independiente de `CONTACT_TO_EMAIL` (esa es la variable de
 * entorno del lado del servidor); si esa dirección cambia, actualizar
 * también acá. */
const CONTACTO_EMAIL_FALLBACK = 'thehmcontacto@gmail.com';

/** `Date.now()` al abrir el diálogo — junto con el momento del envío,
 * alimenta el chequeo de "muy rápido" de `validarContacto` (ver
 * `packages/contact/src/contacto.ts`). */
let contactoAbiertoEnMs = 0;

function abrirContactoPopup(): void {
  const dialog = document.getElementById('contacto-popup') as HTMLDialogElement | null;
  const form = document.getElementById('form-contacto') as HTMLFormElement | null;
  const estadoEl = document.getElementById('contacto-estado');
  if (!dialog || !form || !estadoEl) return;
  form.reset();
  estadoEl.classList.add('hidden');
  estadoEl.classList.remove('exito', 'error');
  contactoAbiertoEnMs = Date.now();
  dialog.showModal();
}

function leerEntradaContacto(form: HTMLFormElement): EntradaContacto {
  const datos = new FormData(form);
  return {
    nombre: String(datos.get('nombre') ?? '').trim(),
    email: String(datos.get('email') ?? '').trim(),
    mensaje: String(datos.get('mensaje') ?? ''),
    honeypot: String(datos.get('sitio_web') ?? ''),
    cargadoEnMs: contactoAbiertoEnMs,
    enviadoEnMs: Date.now(),
  };
}

function mostrarEstadoContacto(texto: string, clase: 'exito' | 'error' | null): void {
  const estadoEl = document.getElementById('contacto-estado');
  if (!estadoEl) return;
  estadoEl.innerHTML = texto;
  estadoEl.classList.remove('hidden', 'exito', 'error');
  if (clase) estadoEl.classList.add(clase);
}

/** El sitio tiene que seguir funcionando por `file://` (`docs/despliegue.md`)
 * — ahí un `fetch('/api/contact')` no falla de forma recuperable, la URL
 * ni siquiera resuelve a un host. Se detecta ANTES de intentar la red y se
 * muestra directo el enlace `mailto:` con el mensaje precargado, en vez de
 * un error de red genérico y confuso. */
function mostrarFallbackMailto(entrada: EntradaContacto): void {
  const asunto = encodeURIComponent(`Contacto — ${entrada.nombre || 'sin nombre'}`);
  const cuerpo = encodeURIComponent(entrada.mensaje);
  const mailto = `mailto:${CONTACTO_EMAIL_FALLBACK}?subject=${asunto}&body=${cuerpo}`;
  mostrarEstadoContacto(textosDe(idiomaActual).contacto.fallbackMailtoHtml({ mailto }), null);
}

async function enviarContacto(e: SubmitEvent): Promise<void> {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  const boton = document.getElementById('contacto-enviar') as HTMLButtonElement | null;
  const t = textosDe(idiomaActual).contacto;
  const entrada = leerEntradaContacto(form);

  // Validación client-side: feedback instantáneo, no es el borde de
  // seguridad real — eso vuelve a correr server-side en /api/contact.ts.
  const validacion = validarContacto(entrada);
  if (!validacion.ok) {
    mostrarEstadoContacto(t.error[validacion.codigo], 'error');
    return;
  }

  if (location.protocol === 'file:') {
    mostrarFallbackMailto(entrada);
    return;
  }

  if (boton) boton.disabled = true;
  mostrarEstadoContacto(t.enviando, null);

  try {
    const resp = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entrada),
    });
    const json = (await resp.json()) as { ok: boolean; codigo?: keyof typeof t.error };
    if (json.ok) {
      mostrarEstadoContacto(t.exito, 'exito');
      form.reset();
    } else {
      mostrarEstadoContacto(t.error[json.codigo ?? 'error-servidor'], 'error');
    }
  } catch {
    mostrarEstadoContacto(t.error['error-servidor'], 'error');
  } finally {
    if (boton) boton.disabled = false;
  }
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
  document.getElementById('btn-guardar')?.addEventListener('click', () => abrirGuardarPopup());

  document.querySelectorAll<HTMLButtonElement>('.infobtn[data-info]').forEach((b) => {
    b.addEventListener('click', () => abrirInfoPopup(b.dataset.info as InfoClave));
  });
  const infoPopup = document.getElementById('info-popup') as HTMLDialogElement | null;
  document.getElementById('info-popup-cerrar')?.addEventListener('click', () => infoPopup?.close());
  infoPopup?.addEventListener('click', (e) => {
    if (e.target === infoPopup) infoPopup.close();
  });

  document.getElementById('btn-contacto-splash')?.addEventListener('click', () => abrirContactoPopup());
  document.getElementById('btn-contacto-config')?.addEventListener('click', () => abrirContactoPopup());
  document.getElementById('btn-contacto-resultado')?.addEventListener('click', () => abrirContactoPopup());
  document.getElementById('btn-contacto-info')?.addEventListener('click', () => abrirContactoPopup());
  const contactoPopup = document.getElementById('contacto-popup') as HTMLDialogElement | null;
  document.getElementById('contacto-cerrar')?.addEventListener('click', () => contactoPopup?.close());
  contactoPopup?.addEventListener('click', (e) => {
    if (e.target === contactoPopup) contactoPopup.close();
  });
  document.getElementById('form-contacto')?.addEventListener('submit', enviarContacto);

  document.getElementById('sel-spk-marca')?.addEventListener('change', (e) => setMarca('spk', (e.target as HTMLSelectElement).value));
  document.getElementById('sel-amp-marca')?.addEventListener('change', (e) => setMarca('amp', (e.target as HTMLSelectElement).value));
  document.getElementById('sel-streamer-marca')?.addEventListener('change', (e) => setMarca('streamer', (e.target as HTMLSelectElement).value));
  document.getElementById('sel-dac-marca')?.addEventListener('change', (e) => setMarca('dac', (e.target as HTMLSelectElement).value));

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

  document.querySelectorAll<HTMLButtonElement>('[data-pestana]').forEach((b) => {
    b.addEventListener('click', () => activarPestana(b.dataset.pestana as 'original' | 'modificado'));
  });
  document.getElementById('btn-recalcular')?.addEventListener('click', recalcular);

  const plan = document.getElementById('plan');
  if (plan) {
    activarArrastre(
      plan,
      () => ultimoAnalisis!.sala,
      () => ultimoAnalisis !== null && estado.vistaPlano === 'superior',
      { onMover: onMoverParlante, onSoltar: () => {} }
    );
  }

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
