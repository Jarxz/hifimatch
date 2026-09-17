import './estilos.css';
import { inject as inicializarVercelAnalytics } from '@vercel/analytics';
import { CATALOGO } from '../../../packages/data/src/catalogo.ts';
import { calcularDisposicion, calcularDisposicionManual, calcularDisposicionAsientoManual } from '../../../packages/engine/src/sala.ts';
import type { Sala, DisposicionSala, Punto } from '../../../packages/engine/src/sala.ts';
import { evaluarPotencia, PICO_OBJETIVO_DB } from '../../../packages/engine/src/potencia.ts';
import { evaluarCarga } from '../../../packages/engine/src/carga.ts';
import { evaluarAmortiguamiento } from '../../../packages/engine/src/amortiguamiento.ts';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from '../../../packages/engine/src/ganancia.ts';
import type { ResultadoPuenteImpedancias, ResultadoRecorridoVolumen } from '../../../packages/engine/src/ganancia.ts';
import { evaluarModos, evaluarNuloEscucha, evaluarAcoplamientoModal, techoModosDesdeSchroeder } from '../../../packages/engine/src/modos.ts';
import { evaluarReverberacion, ABSORCION_MURO_BANDAS, ABSORCION_PISO_BANDAS, ABSORCION_TECHO_BANDAS } from '../../../packages/engine/src/reverberacion.ts';
import type { MaterialMuro, MaterialPiso, MaterialTecho, Materiales } from '../../../packages/engine/src/reverberacion.ts';
import { frecuenciaModoAxialHz } from '../../../packages/engine/src/unidades.ts';
import { evaluarFiltroPeine, evaluarAsimetria, evaluarAnguloEscucha } from '../../../packages/engine/src/colocacion.ts';
import type { Genero } from '../../../packages/engine/src/genero.ts';
import { CREST_FACTOR_DB } from '../../../packages/engine/src/genero.ts';
import { calcularVeredicto } from '../../../packages/engine/src/veredicto.ts';
import type { NivelEscucha } from '../../../packages/engine/src/potencia.ts';
import type { Idioma } from '../../../packages/data/src/idioma.ts';
import { validarContacto } from '../../../packages/contact/src/contacto.ts';
import type { EntradaContacto } from '../../../packages/contact/src/contacto.ts';
import { construirFuenteWeb } from '../../../packages/buscador/src/buscador.ts';
import type { CategoriaBusqueda } from '../../../packages/buscador/src/buscador.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../packages/data/src/tipos-catalogo.ts';

import { estado } from './estado.ts';
import type { NivelUI } from './estado.ts';
import { ir } from './vista/pantallas.ts';
import type { Pantalla } from './vista/pantallas.ts';
import { infoHtmlParlante, infoHtmlAmplificador, infoHtmlFuente } from './vista/selectores.ts';
import { buscarLocal } from './datos/buscadorLocal.ts';
import type { CategoriaLocal } from './datos/buscadorLocal.ts';
import { registrarEquipo, buscarEnRegistro } from './datos/registroEquipos.ts';
import { modeloListaResultados, modeloEstadoBusqueda, modeloPanelManual } from './vista/resultadosBusqueda.ts';
import { construirEscala } from './vista/medidor.ts';
import { iniciarBootSplash } from './vista/bootSplash.ts';
import { construirPlanoSvg } from './vista/plano.ts';
import type { MurosVista, Vista } from './vista/plano.ts';
import { activarArrastre } from './vista/arrastre.ts';
import { construirCurvasModalesSvg } from './vista/curvamodal.ts';
import {
  modeloPotencia,
  modeloCarga,
  modeloAmortiguamiento,
  modeloPuente,
  modeloRecorrido,
  modeloModos,
  modeloFiltroPeine,
  modeloTrianguloEscucha,
  modeloReverberacion,
  modeloUbicacionParlantes,
  modeloResumenFinal,
  modeloNotaSinDatos,
  modeloVeredicto,
  modeloRecomendacionesTop,
  modeloDocumento,
} from './vista/resultado.ts';
import type { ComponenteResumen } from './vista/resultado.ts';
import {
  pintarCadena,
  pintarSala,
  pintarPotencia,
  pintarCarga,
  pintarAmortiguamiento,
  pintarGanancia,
  pintarPlano,
  pintarModos,
  pintarFiltroPeine,
  pintarTrianguloEscucha,
  pintarCurvasModales,
  pintarReverberacion,
  pintarVeredicto,
  pintarRecomendacionesTop,
  pintarNotaSinDatos,
  pintarDocumento,
  pintarMatchDelMes,
} from './vista/pintar.ts';
import { elegirMatchDelMes } from './datos/matchDelMes.ts';
import { modeloMatchDelMes } from './vista/matchDelMes.ts';
import { parlanteDelCatalogo, amplificadorDelCatalogo, fuenteDelCatalogo } from './datos/adaptadores.ts';
import { especParlante, especAmplificador, especFuente } from './datos/etiquetas.ts';
import { num, numConSigno } from './formato/numeros.ts';
import { idiomaInicial, guardarIdioma, aplicarCromoEstatico, textosDe } from './idioma/idioma.ts';
import { codificarEstadoAr } from './ar/estadoUrl.ts';
import type { EstadoAr } from './ar/estadoUrl.ts';
import { tieneNavigatorXr, esUserAgentIOS, QUICK_LOOK_HABILITADO } from './ar/soporte.ts';

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
  resAmortiguamiento: ReturnType<typeof evaluarAmortiguamiento>;
  mAmortiguamiento: ReturnType<typeof modeloAmortiguamiento>;
  resPuenteStreamer: ResultadoPuenteImpedancias | null;
  mPuenteStreamer: ReturnType<typeof modeloPuente> | null;
  resRecorridoStreamer: ResultadoRecorridoVolumen | null;
  mRecorridoStreamer: ReturnType<typeof modeloRecorrido> | null;
  resPuenteDac: ResultadoPuenteImpedancias | null;
  mPuenteDac: ReturnType<typeof modeloPuente> | null;
  resRecorridoDac: ResultadoRecorridoVolumen | null;
  mRecorridoDac: ReturnType<typeof modeloRecorrido> | null;
  resModos: ReturnType<typeof evaluarModos>;
  resReverb: ReturnType<typeof evaluarReverberacion>;
  mReverb: ReturnType<typeof modeloReverberacion>;
  materiales: Materiales;
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
  /** Depende de `disposicion.puntoDulce.y` (cruce geometría↔modo, ver
   * modos.ts) — a diferencia de `resModos`, que sólo mira dimensiones. */
  resNuloEscucha: ReturnType<typeof evaluarNuloEscucha>;
  /** Acoplamiento modal del PARLANTE (peor de los dos canales, ver
   * `construirSnapshot`) — misma dependencia de disposición que resNuloEscucha. */
  resAcoplamiento: ReturnType<typeof evaluarAcoplamientoModal>;
  mModos: ReturnType<typeof modeloModos>;
  mFiltroPeine: ReturnType<typeof modeloFiltroPeine>;
  mTriangulo: ReturnType<typeof modeloTrianguloEscucha>;
  veredicto: ReturnType<typeof calcularVeredicto>;
  mVeredicto: ReturnType<typeof modeloVeredicto>;
  componentesResumen: ComponenteResumen[];
  /** Candado del punto de escucha con el que se calculó ESTE snapshot — ver
   * estado.ts. "Análisis original" siempre es `false` (nunca pasa por el
   * candado); "Modificado" refleja el estado real al momento de
   * "Recalcular". El comparador avisa cuando difieren entre pestañas. */
  candadoAbierto: boolean;
}

/** "The Match Recomendado" se calcula UNA sola vez al cargar (no depende
 * de nada que el usuario elija) y se cachea acá — cambiar de idioma sólo
 * re-redacta el mismo resultado, nunca vuelve a correr el motor sobre
 * todo el catálogo. */
let matchDelMesCache: ReturnType<typeof elegirMatchDelMes> = null;

let ultimoAnalisis: UltimoAnalisis | null = null;
let analisisOriginal: SnapshotAnalisis | null = null; // se fija una vez por "Analizar", nunca se pisa
let analisisModificado: SnapshotAnalisis | null = null; // null hasta el primer "Recalcular"; se reemplaza en cada uno siguiente
let pestanaActiva: 'original' | 'modificado' = 'original';
/** Posición "en curso" del arrastre — independiente de qué pestaña está
 * activa; "Recalcular" congela esto en un snapshot nuevo. */
let disposicionManual: { parlanteIzq: Punto; parlanteDer: Punto } | null = null;

/** Posición manual del asiento (punto de escucha) — sobrevive a que el
 * candado se cierre y se vuelva a abrir ("Volver a cerrar el candado no
 * debe destruir el trabajo de arrastre"): cerrar el candado NO borra esto,
 * sólo deja de usarse para el cálculo hasta que se vuelve a abrir. `null`
 * hasta el primer arrastre del asiento (o hasta la primera vez que se abre
 * el candado, momento en el que se fija a la posición actual para que
 * destrabar nunca mueva el asiento). Se resetea en cada "Analizar" nuevo. */
let asientoManualGuardado: Punto | null = null;

/** Geometría del último análisis pintado — sólo para poder re-dibujar el
 * plano isométrico cuando el usuario cambia de vista (isométrica/frontal/
 * lateral/superior) o arrastra un parlante, sin recalcular potencia ni
 * veredicto. `null` antes del primer "Analizar". `referenciaSimetricaM`
 * viaja junto a la disposición: no-null cuando el candado está abierto (ver
 * plano.ts, construirPlanoSvg) — la posición que tendría el asiento si
 * estuviera cerrado, dibujada como referencia punteada. */
let ultimoPlano: { sala: Sala; disposicion: DisposicionSala; murosVista: MurosVista; referenciaSimetricaM: Punto | null } | null = null;

function repintarPlano(): void {
  if (!ultimoPlano) return;
  const editable = estado.vistaPlano === 'superior';
  pintarPlano(
    construirPlanoSvg(
      ultimoPlano.sala,
      ultimoPlano.disposicion,
      ultimoPlano.murosVista,
      estado.vistaPlano,
      idiomaActual,
      editable,
      ultimoPlano.referenciaSimetricaM
    )
  );
}

function nivelTextoDe(lvl: NivelUI, idioma: Idioma): string {
  const t = textosDe(idioma).config;
  return { mod: t.nivelModerado, alto: t.nivelAlto, ref: t.nivelReferencia }[lvl];
}

/**
 * "Dato" compacto (número + unidad, monoespaciado) que se lee sin abrir
 * la fila de cada regla — la "Jerarquía de la página de resultado" pide
 * nombre a la izquierda, dato a la derecha, nada más, en el resumen
 * colapsado. Ninguna de estas funciones redacta ni evalúa: sólo
 * re-muestra un número que la regla correspondiente ya calculó, mismo
 * principio que `ComponenteResumen.detalle` (que ya hacía esto para
 * potencia/puente/recorrido antes de esta ronda).
 */
function datoPotencia(r: ReturnType<typeof evaluarPotencia>): string {
  return `${numConSigno(r.margenDb, 1, idiomaActual)} dB`;
}
function datoCarga(r: ReturnType<typeof evaluarCarga>, spk: ReturnType<typeof buscarParlante>): string {
  if (r.severidad === 'sin-datos') return '—';
  if (r.epdrOhm !== null) return `EPDR ${num(r.epdrOhm, 1, idiomaActual)} Ω`;
  return spk.impedanciaMinOhm !== null ? `${num(spk.impedanciaMinOhm, 1, idiomaActual)} Ω` : '—';
}
function datoAmortiguamiento(r: ReturnType<typeof evaluarAmortiguamiento>): string {
  return r.severidad === 'sin-datos' || r.deltaDb === null ? '—' : `${numConSigno(r.deltaDb, 2, idiomaActual)} dB`;
}
function datoPuente(r: ResultadoPuenteImpedancias): string {
  return r.severidad === 'sin-datos' || r.ratioZ === null ? '—' : `${num(r.ratioZ, 1, idiomaActual)}×`;
}
function datoRecorrido(r: ResultadoRecorridoVolumen): string {
  return r.severidad === 'sin-datos' || r.margenV === null ? '—' : `${num(r.margenV, 1, idiomaActual)}×`;
}
/** Frecuencia del nulo de escucha si hay uno; si no, la del par agrupado
 * de menor frecuencia; si no, el % de acoplamiento del peor modo; si
 * ninguno de los tres aplica ("bien distribuidos"), sin dato que mostrar. */
function datoModos(
  a: UltimoAnalisis,
  resNulo: ReturnType<typeof evaluarNuloEscucha>,
  resAcoplamiento: ReturnType<typeof evaluarAcoplamientoModal>
): string {
  if (resNulo.codigo === 'nulo-cerca') return `${num(resNulo.frecuenciaHz, 1, idiomaActual)} Hz`;
  if (a.resModos.agrupados.length > 0) return `${num(a.resModos.agrupados[0]!.modoA.frecuenciaHz, 1, idiomaActual)} Hz`;
  if (resAcoplamiento.severidad === 'warn') {
    return `${num(Math.max(...resAcoplamiento.modos.map((m) => m.producto)) * 100, 0, idiomaActual)}%`;
  }
  return '—';
}
function datoFiltroPeine(resultados: ReturnType<typeof evaluarFiltroPeine>): string {
  const n = resultados.filter((r) => r.severidad === 'warn').length;
  return n > 0 ? `${n}/10` : '—';
}
function datoTriangulo(resAngulo: ReturnType<typeof evaluarAnguloEscucha>): string {
  return `${num(resAngulo.anguloGrados, 0, idiomaActual)}°`;
}
function datoReverberacion(r: ReturnType<typeof evaluarReverberacion>): string {
  const [amoblado, vacio] = r.rt60RangoS;
  return amoblado === null || vacio === null ? '—' : `≈${num(amoblado, 1, idiomaActual)}–${num(vacio, 1, idiomaActual)} s`;
}

/**
 * Consulta PRIMERO el registro en memoria (equipos hallados por búsqueda
 * web o ingresados a mano, ver datos/registroEquipos.ts) y recién si no
 * hay nada ahí cae al catálogo curado — la pieza que evita reescribir el
 * resto del frontend: `estado.spk/amp/streamer/dac` siguen siendo
 * `string | null` con un id, `chipsParlante`/`infoHtmlParlante` y todo lo
 * que ya consume estas 3 funciones no se entera de dónde salió el
 * equipo. El cast es seguro: un id registrado bajo 'parlante:' siempre
 * se construyó con `construirParlanteWeb` (mismo criterio en las otras
 * dos), nunca se registra un tipo equivocado bajo esa categoría.
 */
function buscarParlante(id: string): ParlanteCat {
  const registrado = buscarEnRegistro(id);
  if (registrado) return registrado as ParlanteCat;
  const p = CATALOGO.parlantes.find((x) => x.id === id);
  if (!p) throw new Error(`parlante no encontrado: ${id}`);
  return p;
}
function buscarAmplificador(id: string): AmplificadorCat {
  const registrado = buscarEnRegistro(id);
  if (registrado) return registrado as AmplificadorCat;
  const a = CATALOGO.amplificadores.find((x) => x.id === id);
  if (!a) throw new Error(`amplificador no encontrado: ${id}`);
  return a;
}
function buscarFuente(id: string): FuenteCat {
  const registrado = buscarEnRegistro(id);
  if (registrado) return registrado as FuenteCat;
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
  // Lectura en vivo del modo axial de orden 1 de la dimensión mayor
  // (ancho o largo, la que sea más grande en cada momento) — misma
  // fórmula real que usa evaluarModos() (frecuenciaModoAxialHz,
  // unidades.ts), no un número aparte inventado para esta vista previa.
  const modoAxialEl = document.getElementById('v-modo-axial');
  if (modoAxialEl) {
    const dimensionMayorM = Math.max(estado.W, estado.L);
    modoAxialEl.textContent = num(frecuenciaModoAxialHz(dimensionMayorM, 1), 1, idiomaActual) + ' Hz';
  }
}

/** Banda de 500 Hz — misma "banda de referencia" que ya usa la tarjeta de
 * Reverberación para el desglose superficie por superficie (CoefBandas es
 * [125, 500, 2000] Hz). Puramente informativo acá: sólo redondea a la
 * vista un coeficiente que el motor ya declara en reverberacion.ts, no
 * calcula nada nuevo. */
const BANDA_REFERENCIA_INDICE = 1;

function actualizarAlfas(): void {
  const filas: Array<[string, number]> = [
    ['alfa-murofrontal', ABSORCION_MURO_BANDAS[estado.muroFrontal][BANDA_REFERENCIA_INDICE]],
    ['alfa-muroposterior', ABSORCION_MURO_BANDAS[estado.muroPosterior][BANDA_REFERENCIA_INDICE]],
    ['alfa-muroizquierdo', ABSORCION_MURO_BANDAS[estado.muroIzquierdo][BANDA_REFERENCIA_INDICE]],
    ['alfa-muroderecho', ABSORCION_MURO_BANDAS[estado.muroDerecho][BANDA_REFERENCIA_INDICE]],
    ['alfa-piso', ABSORCION_PISO_BANDAS[estado.piso][BANDA_REFERENCIA_INDICE]],
    ['alfa-techo', ABSORCION_TECHO_BANDAS[estado.techo][BANDA_REFERENCIA_INDICE]],
  ];
  for (const [id, valor] of filas) {
    const el = document.getElementById(id);
    if (el) el.textContent = 'α ' + num(valor, 2, idiomaActual);
  }
}

/** Badges mono de los botones de Nivel de escucha / Género musical (ver
 * index.html .cfg-seg3) — mismos números que ya usa el motor
 * (PICO_OBJETIVO_DB en potencia.ts, CREST_FACTOR_DB en genero.ts), nunca
 * un valor aparte inventado para que el botón "se vea con datos" como en
 * la maqueta de Stitch (esa mostraba dBA/DR sin relación con este motor). */
function actualizarBadgesNivelGenero(): void {
  const t = textosDe(idiomaActual).config;
  const nivelBadges: Array<[string, NivelUI]> = [
    ['v-pico-mod', 'mod'],
    ['v-pico-alto', 'alto'],
    ['v-pico-ref', 'ref'],
  ];
  for (const [id, lvl] of nivelBadges) {
    const el = document.getElementById(id);
    if (el) el.textContent = t.nivelPico({ db: num(PICO_OBJETIVO_DB[NIVEL_MOTOR[lvl]], 0, idiomaActual) });
  }
  const generoBadges: Array<[string, Genero]> = [
    ['v-cresta-rockpop', 'rockpop'],
    ['v-cresta-jazzvocal', 'jazzvocal'],
    ['v-cresta-clasica', 'clasica'],
  ];
  for (const [id, genero] of generoBadges) {
    const el = document.getElementById(id);
    if (el) el.textContent = t.generoCresta({ db: num(CREST_FACTOR_DB[genero], 0, idiomaActual) });
  }
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
    miss.textContent = ok ? t.sinInconsistencias : t.faltaElegir({ que: faltantes.join(t.faltaY) });
    miss.classList.toggle('miss-ok', ok);
  }

  // Contador real de requeridos elegidos (parlante + amplificador) — mismo
  // booleano `ok` de arriba, sólo expresado como "X de 2" para la caja de
  // estado del encabezado y la insignia de la barra inferior.
  const hechos = (estado.spk !== null ? 1 : 0) + (estado.amp !== null ? 1 : 0);
  const estadoValorEl = document.getElementById('cfg-estado-valor');
  if (estadoValorEl) estadoValorEl.textContent = t.estadoAnalisisValor({ hechos: String(hechos), total: '2' });
  const estadoDotEl = document.getElementById('cfg-estado-dot');
  if (estadoDotEl) estadoDotEl.classList.toggle('cfg-estado-dot-listo', ok);
  const footBadge = document.getElementById('foot-bar-badge');
  if (footBadge) {
    footBadge.textContent = ok ? t.listoAnalizar : t.faltanDatos;
    footBadge.classList.toggle('foot-bar-badge-listo', ok);
  }
}

function infoHTML(kind: 'spk' | 'amp' | 'streamer' | 'dac', id: string): string {
  if (kind === 'spk') return infoHtmlParlante(buscarParlante(id), idiomaActual);
  if (kind === 'amp') return infoHtmlAmplificador(buscarAmplificador(id), idiomaActual);
  return infoHtmlFuente(buscarFuente(id), idiomaActual);
}

/**
 * Elige (o limpia, con `valor === ''`) el equipo de una categoría.
 * Streamer y DAC son independientes y opcionales, igual que parlante/
 * amplificador — el usuario puede elegir uno, otro, los dos o ninguno;
 * cada uno evalúa su propio puente/recorrido contra el amplificador (ver
 * pintarGanancia), así que no hace falta exclusión mutua. Ya no depende
 * de un `<select id="sel-{kind}">` — los 2 `<select>` en cascada de esta
 * categoría se reemplazaron por el buscador marca+modelo (ver
 * `iniciarBuscadorEquipos()` más abajo); esta función sigue siendo el
 * único lugar que toca `estado[kind]` y repinta la tarjeta `.info`.
 */
function pick(kind: 'spk' | 'amp' | 'streamer' | 'dac', valor: string): void {
  const box = document.getElementById('info-' + kind);
  if (!box) return;

  if (!valor) {
    estado[kind] = null;
    box.innerHTML = '';
  } else {
    estado[kind] = valor;
    box.innerHTML = infoHTML(kind, valor);
  }
  refrescar();
}

// ── Buscador de equipos: marca + modelo → catálogo curado (Fuse.js) o
// búsqueda web (packages/buscador) o ficha manual. Reemplaza los 2
// <select> en cascada que existían antes — ver packages/buscador/src/
// buscador.ts para el porqué de cada decisión de fondo (rangos físicos,
// las 2 llamadas a Gemini, el geo-gate); acá sólo se orquesta la UI.
const CATEGORIA_BUSQUEDA: Record<CategoriaLocal, CategoriaBusqueda> = {
  spk: 'parlante',
  amp: 'amplificador',
  streamer: 'streamer',
  dac: 'dac',
};

interface PanelBuscador {
  kind: CategoriaLocal;
  inputMarca: HTMLInputElement;
  inputModelo: HTMLInputElement;
  botonBuscar: HTMLButtonElement;
  panel: HTMLElement;
}

function panelesBuscador(): PanelBuscador[] {
  const kinds: CategoriaLocal[] = ['spk', 'amp', 'streamer', 'dac'];
  const resultado: PanelBuscador[] = [];
  for (const kind of kinds) {
    const inputMarca = document.getElementById(`in-${kind}-marca`) as HTMLInputElement | null;
    const inputModelo = document.getElementById(`in-${kind}-modelo`) as HTMLInputElement | null;
    const botonBuscar = document.getElementById(`btn-${kind}-buscar`) as HTMLButtonElement | null;
    const panel = document.getElementById(`panel-${kind}`);
    if (inputMarca && inputModelo && botonBuscar && panel) resultado.push({ kind, inputMarca, inputModelo, botonBuscar, panel });
  }
  return resultado;
}

function ocultarPanelBuscador(p: PanelBuscador): void {
  p.panel.innerHTML = '';
  p.panel.classList.add('hidden');
}

function mostrarPanelBuscador(p: PanelBuscador, html: string): void {
  p.panel.innerHTML = html;
  p.panel.classList.remove('hidden');
}

/** Un equipo encontrado (local, web o manual) siempre termina acá: reusa
 * `pick()` — misma limpieza de estado, mismo repintado de `.info`, mismo
 * `refrescar()` que ya habilita "Analizar" — cero lógica nueva. Además
 * refleja en los 2 campos de texto qué quedó elegido, para que el
 * usuario vea confirmado lo que tipeó (o corrigió, si había un error). */
function elegirEquipoEncontrado(p: PanelBuscador, id: string, marca: string, nombre: string): void {
  pick(p.kind, id);
  p.inputMarca.value = marca;
  p.inputModelo.value = nombre.startsWith(marca) ? nombre.slice(marca.length).trim() : nombre;
  ocultarPanelBuscador(p);
}

/** Sólo para resolver el click de un resultado ya mostrado (local o de
 * una búsqueda anterior) — el id siempre existe en catálogo o registro
 * en ese momento, pero el try/catch cubre el caso defensivo de que no. */
function buscarEquipoPorId(kind: CategoriaLocal, id: string): { marca: string; nombre: string } | null {
  try {
    if (kind === 'spk') return buscarParlante(id);
    if (kind === 'amp') return buscarAmplificador(id);
    return buscarFuente(id);
  } catch {
    return null;
  }
}

/**
 * Panel de "no se encontró" — deliberadamente sin campos numéricos para
 * parlante/amplificador (ver el comentario de cabecera de
 * `modeloPanelManual` en vista/resultadosBusqueda.ts): sensibilidad,
 * impedancia y potencia las entrega el buscador, nunca el usuario a
 * mano. La única acción ahí es "Avisar al sitio sobre este equipo".
 * Streamer/DAC siguen con "usar sin datos de salida" — no le pide un
 * número a nadie, el motor no exige ninguno para esa categoría.
 */
function mostrarPanelManual(p: PanelBuscador, textoEstado: string | null, marca: string, modelo: string): void {
  const estadoHtml = textoEstado ? modeloEstadoBusqueda(textoEstado) : '';
  mostrarPanelBuscador(p, estadoHtml + modeloPanelManual(p.kind, idiomaActual));
  wireAccionesSinResultado(p, marca, modelo);
}

function wireAccionesSinResultado(p: PanelBuscador, marca: string, modelo: string): void {
  p.panel.querySelector('.manual-solicitar-alta')?.addEventListener('click', () => {
    abrirContactoPopup(`Solicitud de equipo — ${marca} ${modelo}`.trim());
  });

  // `kind` capturado en una const local — el estrechamiento de tipo de
  // `p.kind` (propiedad de un objeto) no sobrevive dentro de una
  // clausura para TypeScript, aunque en los hechos nunca cambie; una
  // const local sí se estrecha de forma estable dentro del closure.
  const kind = p.kind;
  if (kind === 'streamer' || kind === 'dac') {
    p.panel.querySelector('.manual-usar-sin-datos')?.addEventListener('click', () => {
      const equipo = construirFuenteWeb(kind, marca, modelo, { salidaV: null, impedanciaSalidaOhm: null }, null);
      registrarEquipo(equipo);
      elegirEquipoEncontrado(p, equipo.id, equipo.marca, equipo.nombre);
    });
  }
}

/**
 * Orquesta el flujo completo de una búsqueda: catálogo curado local
 * primero (Fuse.js, $0, instantáneo) → si no hay nada Y hay marca+modelo
 * tipeados, búsqueda web (`/api/buscar-equipo`) → si tampoco, ficha
 * manual. Con los 2 campos vacíos, lista el catálogo completo de la
 * categoría (explorar sin saber qué buscar) — lo único bueno que tenían
 * los 2 `<select>` en cascada que esto reemplaza.
 *
 * `forzarWeb` (default false): salta el catálogo local y va directo a
 * la web, sin importar si Fuse.js encontraría algo — lo dispara el
 * botón "ninguno de estos es mi equipo" de `modeloListaResultados`. Sin
 * esto, un candidato local parecido pero equivocado (ej. "Yamaha
 * A-S1200" al buscar "Yamaha A-S3200") bloqueaba la búsqueda web sin
 * dar ningún camino hacia adelante — bug real reportado por el usuario.
 */
async function ejecutarBusqueda(p: PanelBuscador, forzarWeb = false): Promise<void> {
  const marca = p.inputMarca.value.trim();
  const modelo = p.inputModelo.value.trim();
  const t = textosDe(idiomaActual).config;

  if (!forzarWeb) {
    const locales = buscarLocal(p.kind, marca, modelo);
    const explorando = marca === '' && modelo === '';
    if (explorando || locales.length > 0) {
      mostrarPanelBuscador(p, modeloListaResultados(locales, p.kind, idiomaActual, !explorando, !explorando));
      return;
    }
  }

  if (marca === '' || modelo === '') {
    // La API exige los dos campos — con sólo uno tipeado no hay nada
    // que buscar en la web, directo a la ficha manual.
    mostrarPanelManual(p, t.buscarEstadoSinResultado, marca, modelo);
    return;
  }
  if (location.protocol === 'file:') {
    // Mismo guardia que ya usa enviarContacto: por file:// un fetch no
    // falla de forma recuperable, la URL ni siquiera resuelve a un host.
    mostrarPanelManual(p, t.buscarEstadoOffline, marca, modelo);
    return;
  }

  mostrarPanelBuscador(p, modeloEstadoBusqueda(t.buscarEstadoBuscandoWeb));
  p.botonBuscar.disabled = true;
  try {
    const res = await fetch('/api/buscar-equipo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoria: CATEGORIA_BUSQUEDA[p.kind], marca, modelo }),
    });
    const datos = await res.json();
    if (datos.ok) {
      registrarEquipo(datos.equipo);
      elegirEquipoEncontrado(p, datos.equipo.id, datos.equipo.marca, datos.equipo.nombre);
    } else {
      const textoPorCodigo: Record<string, string> = {
        'region-restringida': t.buscarEstadoRegionRestringida,
        'cupo-agotado': t.buscarEstadoCupoAgotado,
        'sin-resultado': t.buscarEstadoSinResultado,
        'datos-insuficientes': t.buscarEstadoSinResultado,
      };
      mostrarPanelManual(p, textoPorCodigo[datos.codigo] ?? t.buscarEstadoError, marca, modelo);
    }
  } catch {
    mostrarPanelManual(p, t.buscarEstadoError, marca, modelo);
  } finally {
    p.botonBuscar.disabled = false;
  }
}

function iniciarBuscadorEquipos(): void {
  for (const p of panelesBuscador()) {
    p.botonBuscar.addEventListener('click', () => void ejecutarBusqueda(p));
    [p.inputMarca, p.inputModelo].forEach((input) => {
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          void ejecutarBusqueda(p);
        }
      });
    });
    // Delegado (el contenido de p.panel se reemplaza en cada búsqueda) —
    // mismo patrón que #plan-hint/RECALCULAR: un listener puesto directo
    // en un botón se perdería en el primer repintado.
    p.panel.addEventListener('click', (ev) => {
      const target = ev.target as HTMLElement;
      if (target.closest('.buscar-ninguno-web')) {
        void ejecutarBusqueda(p, true);
        return;
      }
      const boton = target.closest<HTMLElement>('.resultado-item');
      const id = boton?.dataset.elegirId;
      if (!id) return;
      const equipo = buscarEquipoPorId(p.kind, id);
      if (equipo) elegirEquipoEncontrado(p, id, equipo.marca, equipo.nombre);
    });
  }
}

/** Relleno dorado del slider hasta la posición del valor actual (--fill,
 * leído por el degradé de input[type=range] en estilos.css) — nativamente
 * un <input type=range> no expone su propio % recorrido a CSS, así que se
 * calcula acá en cada 'input' y una vez al cargar, para que arranque en la
 * posición correcta con el default (no en el 50% del fallback del degradé). */
function actualizarFillSlider(input: HTMLInputElement): void {
  const min = parseFloat(input.min);
  const max = parseFloat(input.max);
  const pct = ((parseFloat(input.value) - min) / (max - min)) * 100;
  input.style.setProperty('--fill', `${pct}%`);
}

function wireSlider(id: string, dim: 'W' | 'L' | 'H'): void {
  const input = document.getElementById(id) as HTMLInputElement | null;
  if (!input) return;
  actualizarFillSlider(input);
  input.addEventListener('input', () => {
    setDim(dim, parseFloat(input.value));
    actualizarFillSlider(input);
  });
}

function setDim(dim: 'W' | 'L' | 'H', valor: number): void {
  estado[dim] = valor;
  actualizarTextosDimension();
  actualizarResumenSala();
  refrescar();
}

function setNivel(lvl: NivelUI): void {
  estado.lvl = lvl;
  document.querySelectorAll<HTMLButtonElement>('.cfg-seg3 button[data-lvl]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lvl === lvl));
  });
}

// Los 6 selectores de material son <select> nativos (menú desplegable, ver
// index.html #sel-murofrontal etc.) — el propio control ya muestra la
// selección actual, así que estos setters sólo actualizan el estado, sin
// el manejo de aria-pressed que sí necesitan los grupos de botones .segs.
function setMuroFrontal(muro: MaterialMuro): void {
  estado.muroFrontal = muro;
  actualizarResumenSala();
  actualizarAlfas();
}
function setMuroPosterior(muro: MaterialMuro): void {
  estado.muroPosterior = muro;
  actualizarAlfas();
}
function setMuroIzquierdo(muro: MaterialMuro): void {
  estado.muroIzquierdo = muro;
  actualizarAlfas();
}
function setMuroDerecho(muro: MaterialMuro): void {
  estado.muroDerecho = muro;
  actualizarAlfas();
}
function setPiso(piso: MaterialPiso): void {
  estado.piso = piso;
  actualizarResumenSala();
  actualizarAlfas();
}
function setTecho(techo: MaterialTecho): void {
  estado.techo = techo;
  actualizarAlfas();
}

function setGenero(genero: Genero): void {
  estado.genero = genero;
  document.querySelectorAll<HTMLButtonElement>('.cfg-seg3 button[data-genero]').forEach((b) => {
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
  const hintAsiento = document.getElementById('plan-hint-asiento');
  if (hintAsiento) hintAsiento.classList.toggle('hidden', !(estado.candadoAbierto && vista === 'superior'));
  repintarPlano();
}

/** Arma el snapshot completo (potencia + veredicto + resumen) de UNA
 * disposición de parlantes, reusando la parte compartida ya calculada en
 * `ultimoAnalisis` — no recalcula carga/puente/recorrido/modos/
 * reverberación, sólo lo que sí depende de dónde están los parlantes.
 * `candadoAbierto` es el estado del candado CON el que se generó esta
 * `disposicion` (no se lee de `estado` acá para que un snapshot ya
 * congelado — "Análisis original" — nunca cambie de opinión si el usuario
 * sigue tocando el candado después). */
function construirSnapshot(a: UltimoAnalisis, disposicion: DisposicionSala, candadoAbierto: boolean): SnapshotAnalisis {
  const dimensionMayorSalaM = Math.max(a.sala.anchoM, a.sala.largoM, a.sala.altoM);
  const resPot = evaluarPotencia(a.parlanteM, a.ampM, disposicion.distanciaEscuchaIzqM, disposicion.distanciaEscuchaDerM, NIVEL_MOTOR[estado.lvl], dimensionMayorSalaM);
  const mPot = modeloPotencia(a.spk, a.amp, resPot, disposicion.distanciaEscuchaM, a.nivelTexto, a.picoObjetivo, estado.genero, idiomaActual);

  // Cruce geometría↔modo: depende de dónde cae el punto dulce en ESTA
  // disposición, así que se recalcula por snapshot (como potencia), no una
  // sola vez por "Analizar" como resModos (que sólo mira dimensiones).
  const resNuloEscucha = evaluarNuloEscucha(a.sala, disposicion.puntoDulce.y);

  // Acoplamiento modal del PARLANTE (Cambio 2): se evalúa por canal (izq/
  // der pueden estar a distinta profundidad con arrastre independiente) y
  // se muestra/propaga el peor de los dos — comparar por el producto máximo
  // de cada canal alcanza para elegir el correcto: la severidad es
  // monótona en ese máximo (un único umbral global), así que el canal con
  // mayor producto siempre determina la severidad combinada correcta sin
  // necesidad de combinarlas aparte.
  const resAcopIzq = evaluarAcoplamientoModal(a.sala, disposicion.parlanteIzq.y, disposicion.puntoDulce.y);
  const resAcopDer = evaluarAcoplamientoModal(a.sala, disposicion.parlanteDer.y, disposicion.puntoDulce.y);
  const maxProdIzq = Math.max(...resAcopIzq.modos.map((m) => m.producto));
  const maxProdDer = Math.max(...resAcopDer.modos.map((m) => m.producto));
  const resAcoplamiento = maxProdIzq >= maxProdDer ? resAcopIzq : resAcopDer;

  const mModos = modeloModos(a.resModos, resNuloEscucha, resAcoplamiento, idiomaActual);
  const severidadModosCombinada: 'ok' | 'warn' = a.resModos.severidad === 'warn' || resNuloEscucha.severidad === 'warn' ? 'warn' : 'ok';

  // Filtro peine por reflexión (Cambio 3) y triángulo de escucha —
  // asimetría + ángulo (Cambio 4): las dos dependen de la disposición
  // completa (parlantes Y punto dulce), así que se recalculan por
  // snapshot, igual que potencia/modos.
  const resFiltroPeine = evaluarFiltroPeine(disposicion, a.materiales);
  const mFiltroPeine = modeloFiltroPeine(resFiltroPeine, idiomaActual);
  const filtroPeineSeveridad: 'ok' | 'warn' = resFiltroPeine.some((r) => r.severidad === 'warn') ? 'warn' : 'ok';

  const resAsimetria = evaluarAsimetria(disposicion);
  const resAngulo = evaluarAnguloEscucha(disposicion);
  const asimetriaSeveridad: 'ok' | 'warn' = resAsimetria.some((r) => r.severidad === 'warn') ? 'warn' : 'ok';
  const mTriangulo = modeloTrianguloEscucha(resAsimetria, resAngulo, resPot.diferenciaCanalesDb, idiomaActual);

  // "Veredicto" + tres estados — la única evaluación de conjunto del sitio
  // (ver CLAUDE.md). Depende de resPot/mModos (calculados arriba, propios
  // de este snapshot) además de los componentes posición-independientes de
  // `a`, así que se recalcula por snapshot igual que potencia/modos.
  const veredicto = calcularVeredicto({
    potencia: resPot.severidad,
    carga: a.resCarga.severidad,
    amortiguamiento: a.resAmortiguamiento.severidad,
    puenteStreamer: a.resPuenteStreamer ? a.resPuenteStreamer.severidad : null,
    recorridoStreamer: a.resRecorridoStreamer ? a.resRecorridoStreamer.severidad : null,
    puenteDac: a.resPuenteDac ? a.resPuenteDac.severidad : null,
    recorridoDac: a.resRecorridoDac ? a.resRecorridoDac.severidad : null,
    modos: severidadModosCombinada,
    reverberacion: a.resReverb.severidad,
    acoplamientoModal: resAcoplamiento.severidad,
    filtroPeine: filtroPeineSeveridad,
    asimetria: asimetriaSeveridad,
    anguloEscucha: resAngulo.severidad,
  });
  const mVeredicto = modeloVeredicto(
    veredicto,
    {
      mPot,
      mCarga: a.mCarga,
      mAmortiguamiento: a.mAmortiguamiento,
      mPuenteStreamer: a.mPuenteStreamer,
      mRecorridoStreamer: a.mRecorridoStreamer,
      mPuenteDac: a.mPuenteDac,
      mRecorridoDac: a.mRecorridoDac,
      mModos,
      mReverb: a.mReverb,
      mFiltroPeine,
      mTriangulo,
    },
    idiomaActual
  );

  const t = textosDe(idiomaActual);
  const nombreComponente = t.motor.componentes.nombre;
  const componentesResumen: ComponenteResumen[] = [
    {
      nombre: nombreComponente.potencia,
      verdictoClase: mPot.verdictoClase,
      verdictoTexto: mPot.verdictoTexto,
      detalle: `${numConSigno(resPot.margenDb, 1, idiomaActual)} dB`,
      avisoHtml: mPot.avisoHtml,
    },
    { nombre: nombreComponente.carga, verdictoClase: a.mCarga.verdictoClase, verdictoTexto: a.mCarga.verdictoTexto, avisoHtml: a.mCarga.avisoHtml },
    {
      nombre: t.motor.amortiguamiento.nombreCorto,
      verdictoClase: a.mAmortiguamiento.verdictoClase,
      verdictoTexto: a.mAmortiguamiento.verdictoTexto,
      avisoHtml: a.mAmortiguamiento.avisoHtml,
    },
    { nombre: nombreComponente.modos, verdictoClase: mModos.verdictoClase, verdictoTexto: mModos.verdictoTexto, avisoHtml: mModos.sugerenciaHtml },
    { nombre: nombreComponente.filtroPeine, verdictoClase: mFiltroPeine.verdictoClase, verdictoTexto: mFiltroPeine.verdictoTexto, avisoHtml: mFiltroPeine.avisoHtml },
    { nombre: nombreComponente.trianguloEscucha, verdictoClase: mTriangulo.verdictoClase, verdictoTexto: mTriangulo.verdictoTexto, avisoHtml: mTriangulo.avisoHtml },
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

  return { disposicion, resPot, mPot, resNuloEscucha, resAcoplamiento, mModos, mFiltroPeine, mTriangulo, veredicto, mVeredicto, componentesResumen, candadoAbierto };
}

/** Pinta un snapshot completo — potencia, "La cadena", "Sala", veredicto,
 * "En resumen" y el plano — reusando la parte compartida de
 * `ultimoAnalisis`. Un solo lugar sabe pintar "el resultado de una
 * disposición dada", tanto para el primer "Analizar" como para cada
 * cambio de pestaña o "Recalcular" — nada de esto recalcula el motor, sólo
 * asigna al DOM lo que el snapshot ya trae calculado. */
function pintarSnapshot(a: UltimoAnalisis, snap: SnapshotAnalisis): void {
  pintarPotencia(snap.mPot, idiomaActual, datoPotencia(snap.resPot));

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

  // resumenFinal ya no se pinta acá (la tarjeta "En resumen" quedó
  // reemplazada por el veredicto + "Qué conviene hacer") pero sigue
  // calculándose: modeloDocumento (informe) todavía lo consume. Reusa
  // snap.mVeredicto (ya calculado en construirSnapshot) en vez de un
  // puntaje 1-10 aparte — el veredicto es la única evaluación de conjunto
  // del sitio.
  const resumenFinal = modeloResumenFinal(snap.componentesResumen, snap.mVeredicto, idiomaActual);

  pintarModos(snap.mModos, datoModos(a, snap.resNuloEscucha, snap.resAcoplamiento));
  pintarFiltroPeine(snap.mFiltroPeine, datoFiltroPeine(evaluarFiltroPeine(snap.disposicion, a.materiales)));
  pintarTrianguloEscucha(snap.mTriangulo, datoTriangulo(evaluarAnguloEscucha(snap.disposicion)));
  pintarVeredicto(snap.mVeredicto);
  pintarRecomendacionesTop(modeloRecomendacionesTop(snap.componentesResumen, idiomaActual));
  pintarNotaSinDatos(modeloNotaSinDatos(snap.componentesResumen, idiomaActual));

  const referenciaSimetricaM = snap.candadoAbierto ? calcularDisposicionManual(a.sala, snap.disposicion.parlanteIzq, snap.disposicion.parlanteDer).puntoDulce : null;
  ultimoPlano = { sala: a.sala, disposicion: snap.disposicion, murosVista: a.murosVista, referenciaSimetricaM };
  actualizarNavHabilitada();
  repintarPlano();
  const ubicacionEl = document.getElementById('plan-ubicacion');
  if (ubicacionEl) ubicacionEl.innerHTML = modeloUbicacionParlantes(a.sala, snap.disposicion, idiomaActual);
  actualizarUiCandado(snap.candadoAbierto);
  actualizarAvisoCandadoComparador();

  // "Documento" (#s-documento, ahora con pestaña propia — ver
  // actualizarNavHabilitada()): se repinta junto con el resto del
  // resultado para que siempre muestre el análisis vigente. fechaTexto no
  // es un dato del motor, se arma acá con Date.
  const fechaTexto = new Date().toLocaleDateString(idiomaActual === 'es' ? 'es-CL' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  pintarDocumento(
    modeloDocumento(
      a.spk,
      a.amp,
      a.streamer,
      a.dac,
      a.sala,
      snap.disposicion.distanciaEscuchaM,
      a.nivelTexto,
      a.picoObjetivo,
      snap.mVeredicto,
      {
        mPot: snap.mPot,
        mCarga: a.mCarga,
        mAmortiguamiento: a.mAmortiguamiento,
        mPuenteStreamer: a.mPuenteStreamer,
        mRecorridoStreamer: a.mRecorridoStreamer,
        mPuenteDac: a.mPuenteDac,
        mRecorridoDac: a.mRecorridoDac,
        mModos: snap.mModos,
        agrupadosModos: a.resModos.agrupados,
        mFiltroPeine: snap.mFiltroPeine,
        mTriangulo: snap.mTriangulo,
        mReverb: a.mReverb,
        disposicion: snap.disposicion,
        murosVista: a.murosVista,
        resumenFinal,
      },
      fechaTexto,
      idiomaActual
    ),
    snap.resPot.margenDb,
    idiomaActual
  );
}

/** Vista previa liviana durante el arrastre: sólo redibuja el plano y el
 * párrafo de ubicación con la disposición nueva — no toca potencia,
 * veredicto ni "En resumen" (eso sólo pasa al confirmar con "Recalcular").
 * `referenciaSimetricaM` se deriva en vivo de `estado.candadoAbierto`, no
 * del snapshot congelado — así el marcador punteado aparece/desaparece de
 * inmediato al tocar el candado, incluso a mitad de un arrastre. */
function previsualizarDisposicion(disposicion: DisposicionSala): void {
  if (!ultimoAnalisis || !ultimoPlano) return;
  const referenciaSimetricaM = estado.candadoAbierto
    ? calcularDisposicionManual(ultimoAnalisis.sala, disposicion.parlanteIzq, disposicion.parlanteDer).puntoDulce
    : null;
  ultimoPlano = { ...ultimoPlano, disposicion, referenciaSimetricaM };
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

/** Posición de partida para un arrastre del ASIENTO — la última posición
 * manual guardada (sobrevive a que el candado se haya cerrado y reabierto,
 * ver `asientoManualGuardado`), o si nunca se movió, la posición derivada
 * actual de los parlantes dados (mediatriz) — nunca la del análisis viejo. */
function posicionBaseAsiento(parlantes: { parlanteIzq: Punto; parlanteDer: Punto }): Punto {
  if (asientoManualGuardado) return asientoManualGuardado;
  return calcularDisposicionManual(ultimoAnalisis!.sala, parlantes.parlanteIzq, parlantes.parlanteDer).puntoDulce;
}

function onMoverParlante(lado: 'izq' | 'der' | 'asiento', puntoM: Punto): void {
  if (!ultimoAnalisis) return;
  const base = posicionBaseParaArrastre();
  if (!base) return;

  if (lado === 'asiento') {
    if (!estado.candadoAbierto) return; // el agarre del asiento sólo existe en el DOM con el candado abierto — por las dudas
    asientoManualGuardado = puntoM;
    previsualizarDisposicion(calcularDisposicionAsientoManual(ultimoAnalisis.sala, base.parlanteIzq, base.parlanteDer, puntoM));
    return;
  }

  disposicionManual = lado === 'izq' ? { parlanteIzq: puntoM, parlanteDer: base.parlanteDer } : { parlanteIzq: base.parlanteIzq, parlanteDer: puntoM };
  const disposicion = estado.candadoAbierto
    ? calcularDisposicionAsientoManual(ultimoAnalisis.sala, disposicionManual.parlanteIzq, disposicionManual.parlanteDer, posicionBaseAsiento(disposicionManual))
    : calcularDisposicionManual(ultimoAnalisis.sala, disposicionManual.parlanteIzq, disposicionManual.parlanteDer);
  previsualizarDisposicion(disposicion);
}

/** Abre/cierra el candado del punto de escucha — no mueve el asiento al
 * abrir ("arranca exactamente donde estaba"): la primera vez que se abre
 * en esta sesión de arrastre, `asientoManualGuardado` se fija a la
 * posición derivada ACTUAL (mediatriz de los parlantes tal como están
 * ahora, no la del análisis original) antes de recalcular con ella. Cerrar
 * NO borra `asientoManualGuardado` — reabrir lo restituye tal cual. */
function setCandado(abierto: boolean): void {
  if (!ultimoAnalisis) return;
  const base = posicionBaseParaArrastre();
  if (!base) return;
  estado.candadoAbierto = abierto;
  if (abierto && asientoManualGuardado === null) {
    asientoManualGuardado = calcularDisposicionManual(ultimoAnalisis.sala, base.parlanteIzq, base.parlanteDer).puntoDulce;
  }
  const disposicion = abierto
    ? calcularDisposicionAsientoManual(ultimoAnalisis.sala, base.parlanteIzq, base.parlanteDer, asientoManualGuardado!)
    : calcularDisposicionManual(ultimoAnalisis.sala, base.parlanteIzq, base.parlanteDer);
  previsualizarDisposicion(disposicion);
  actualizarUiCandado(abierto);
}

/** Trazo del candado abierto/cerrado — mismo ícono de líneas (Feather
 * "lock"/"unlock"), sólo cambia el atributo `d` del shackle; el resto del
 * SVG (el cuerpo, `<rect>`) es fijo. `stroke="currentColor"` en el propio
 * SVG (index.html) ya hereda el color del texto del botón, incluido el
 * cambio a `--warn` cuando está abierto (`.candado-btn[aria-pressed=true]`,
 * estilos.css) — aquí no hay que tocar color, sólo la forma. */
const CANDADO_SHACKLE_CERRADO = 'M7 11V7a5 5 0 0 1 10 0v4';
const CANDADO_SHACKLE_ABIERTO = 'M7 11V7a5 5 0 0 1 9.9-1';

/** Refleja el estado del candado en el botón (ícono + texto + aria-pressed)
 * y en la visibilidad del hint de arrastre del asiento — separado de
 * `#plan-hint` (arrastre de parlantes), que ya se muestra/oculta según la
 * vista activa; éste depende ADEMÁS de que el candado esté abierto. */
function actualizarUiCandado(abierto: boolean): void {
  const t = textosDe(idiomaActual).resultado.plano;
  const btn = document.getElementById('btn-candado');
  const texto = document.getElementById('btn-candado-texto');
  const shackle = document.getElementById('candado-shackle');
  if (btn) btn.setAttribute('aria-pressed', String(abierto));
  if (texto) texto.textContent = abierto ? t.candadoAbierto : t.candadoCerrado;
  if (shackle) shackle.setAttribute('d', abierto ? CANDADO_SHACKLE_ABIERTO : CANDADO_SHACKLE_CERRADO);
  const hintAsiento = document.getElementById('plan-hint-asiento');
  if (hintAsiento) hintAsiento.classList.toggle('hidden', !(abierto && estado.vistaPlano === 'superior'));
}

/** Si "Análisis original" (candado siempre cerrado) y "Modificado" difieren
 * en estado de candado, una diferencia de MÉTODO (asiento derivado vs.
 * arrastrado a mano) podría leerse como si fuera un efecto de mover los
 * parlantes — se declara explícitamente para que no se confunda una cosa
 * con la otra. */
function actualizarAvisoCandadoComparador(): void {
  const el = document.getElementById('candado-comparador-aviso');
  if (!el) return;
  const difiere = analisisOriginal !== null && analisisModificado !== null && analisisOriginal.candadoAbierto !== analisisModificado.candadoAbierto;
  el.classList.toggle('hidden', !difiere);
}

function mostrarPestanaModificado(): void {
  document.querySelector('[data-pestana="modificado"]')?.classList.remove('hidden');
}

/** Cambia de pestaña repintando el snapshot ya calculado — nunca recalcula
 * el motor. También retoma el arrastre desde donde quedó esa pestaña
 * (parlantes Y candado/asiento), no desde el estado de otra pestaña. */
function activarPestana(pestana: 'original' | 'modificado'): void {
  const snap = pestana === 'original' ? analisisOriginal : analisisModificado;
  if (!snap || !ultimoAnalisis) return;
  pestanaActiva = pestana;
  disposicionManual = { parlanteIzq: snap.disposicion.parlanteIzq, parlanteDer: snap.disposicion.parlanteDer };
  estado.candadoAbierto = snap.candadoAbierto;
  asientoManualGuardado = snap.candadoAbierto ? snap.disposicion.puntoDulce : null;
  pintarSnapshot(ultimoAnalisis, snap);
  document.querySelectorAll<HTMLButtonElement>('[data-pestana]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.pestana === pestana));
  });
  // Sólo "Modificado" recalculó potencia con una disposición distinta —
  // "Análisis original" nunca cambia, así que la aclaración no aplica ahí.
  document.getElementById('pt-nota-recalculo')?.classList.toggle('hidden', pestana !== 'modificado');
}

/** "Recalcular": congela la posición actual del arrastre (parlantes y,
 * si el candado está abierto, el asiento) en un snapshot completo y lo
 * publica como la pestaña "Modificado" — la crea la primera vez, reemplaza
 * su contenido las veces siguientes (nunca hay una tercera pestaña). La
 * pestaña "Análisis original" nunca se toca. */
function recalcular(): void {
  if (!ultimoAnalisis) return;
  // Antes exigía disposicionManual (parlante movido) — con el candado
  // abierto puede haber trabajo que recalcular aunque nunca se haya
  // arrastrado un PARLANTE (sólo el asiento, o el candado recién abierto):
  // cualquiera de los dos cuenta como "hay algo que congelar".
  if (!disposicionManual && !estado.candadoAbierto) return;
  const base = posicionBaseParaArrastre();
  if (!base) return;
  const disposicion = estado.candadoAbierto
    ? calcularDisposicionAsientoManual(ultimoAnalisis.sala, base.parlanteIzq, base.parlanteDer, posicionBaseAsiento(base))
    : calcularDisposicionManual(ultimoAnalisis.sala, base.parlanteIzq, base.parlanteDer);
  analisisModificado = construirSnapshot(ultimoAnalisis, disposicion, estado.candadoAbierto);
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
  pintarCarga(mCarga, datoCarga(resCarga, spk));

  // Igual que resCarga: no depende de la disposición de parlantes, sólo
  // del equipo elegido — se calcula una sola vez por "Analizar".
  const resAmortiguamiento = evaluarAmortiguamiento(parlanteM, ampM);
  const mAmortiguamiento = modeloAmortiguamiento(resAmortiguamiento, idiomaActual);
  pintarAmortiguamiento(mAmortiguamiento, datoAmortiguamiento(resAmortiguamiento));

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
    pintarGanancia('streamer', mPuenteStreamer, mRecorridoStreamer, datoPuente(resPuenteStreamer), datoRecorrido(resRecorridoStreamer));
  } else {
    pintarGanancia('streamer', null, null, '—', '—');
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
    pintarGanancia('dac', mPuenteDac, mRecorridoDac, datoPuente(resPuenteDac), datoRecorrido(resRecorridoDac));
  } else {
    pintarGanancia('dac', null, null, '—', '—');
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

  // resReverb primero: evaluarModos necesita su frecuencia de Schroeder
  // como techo dinámico de listado (ver modos.ts, techoModosDesdeSchroeder)
  // para que la región que "Modos de sala" cubre y la región donde
  // "Reverberación" empieza a ser válida queden contiguas, sin hueco.
  const resReverb = evaluarReverberacion(sala, materiales);
  const mReverb = modeloReverberacion(resReverb, materiales, idiomaActual);
  pintarReverberacion(mReverb, datoReverberacion(resReverb));

  // resModos sólo depende de las dimensiones — se calcula una vez acá,
  // como el resto de ultimoAnalisis. El veredicto/pintado de la tarjeta
  // "Modos de sala" se recalcula por snapshot (construirSnapshot/
  // pintarSnapshot) porque ahora también depende de dónde cae el punto
  // dulce (evaluarNuloEscucha) — ver SnapshotAnalisis.mModos.
  const techoModosHz = techoModosDesdeSchroeder(resReverb.frecuenciaSchroederHz);
  const resModos = evaluarModos(sala, techoModosHz);
  pintarCurvasModales(construirCurvasModalesSvg(sala, resModos.agrupados, idiomaActual), t.motor.modos.curvasCaption);

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
    resAmortiguamiento,
    mAmortiguamiento,
    resPuenteStreamer,
    mPuenteStreamer,
    resRecorridoStreamer,
    mRecorridoStreamer,
    resPuenteDac,
    mPuenteDac,
    resRecorridoDac,
    mRecorridoDac,
    resModos,
    resReverb,
    mReverb,
    materiales,
    murosVista,
    nivelTexto,
    picoObjetivo,
  };

  // "Analizar" nuevo siempre vuelve a partir de cero: candado cerrado y sin
  // posición manual de asiento guardada, igual que un sistema recién
  // elegido — nada de un arrastre de un análisis anterior sobrevive acá
  // (sí sobrevive un cierre/apertura del candado DENTRO del mismo análisis,
  // ver setCandado).
  estado.candadoAbierto = false;
  asientoManualGuardado = null;
  analisisOriginal = construirSnapshot(ultimoAnalisis, calcularDisposicion(sala), false);
  analisisModificado = null;
  disposicionManual = null;
  pestanaActiva = 'original';
  document.querySelector('[data-pestana="original"]')?.setAttribute('aria-pressed', 'true');
  const pestanaModEl = document.querySelector('[data-pestana="modificado"]');
  pestanaModEl?.setAttribute('aria-pressed', 'false');
  pestanaModEl?.classList.add('hidden');
  document.getElementById('pt-nota-recalculo')?.classList.add('hidden');

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
  actualizarAlfas();
  actualizarBadgesNivelGenero();
  actualizarResumenSala();
  repintarMatchDelMes();

  (['spk', 'amp', 'streamer', 'dac'] as const).forEach((kind) => {
    const valor = estado[kind];
    const box = document.getElementById('info-' + kind);
    if (valor && box) box.innerHTML = infoHTML(kind, valor);
  });

  refrescar();
  renderizarResultado();
}

type InfoClave =
  | 'capas'
  | 'confianza'
  | 'potencia'
  | 'carga'
  | 'amortiguamiento'
  | 'ganancia'
  | 'modos'
  | 'filtroPeine'
  | 'triangulo'
  | 'reverberacion'
  | 'plano'
  | 'veredicto';

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
 * declara la limitación, mismo patrón que "Distribuidor
 * próximamente". */
function abrirGuardarPopup(): void {
  const t = textosDe(idiomaActual).resultado;
  abrirPopup(t.guardarPopupTitulo, t.guardarPopupCuerpo);
}

/** ¿El link `<a rel="ar">` de Quick Look tiene alguna chance de andar?
 * Sólo la mitad barata (UA de iOS + `relList.supports('ar')`) — el
 * chequeo real (generar el USDZ) corre recién dentro de ar.html, mismo
 * criterio que ya aplica `soportaArInmersiva()` para WebXR. */
function tieneChanceDeQuickLook(): boolean {
  if (!QUICK_LOOK_HABILITADO) return false; // ver soporte.ts — deshabilitado tras probarlo en hardware real
  const linkSoportaAr = document.createElement('a').relList?.supports?.('ar') ?? false;
  return esUserAgentIOS(navigator.userAgent) && linkSoportaAr;
}

/** "Ver en AR" navega a ar.html (página separada, servida por red —
 * ver vite.ar.config.ts) sólo si hay una chance real de que funcione:
 * nunca por file:// (mismo guardia que ya usa enviarContacto), y sólo
 * si hay `navigator.xr` (WebXR, Android) **o** una chance de Quick Look
 * (iPhone) — ar.html decide cuál de los dos flujos mostrar. El chequeo
 * autoritativo de cada uno (`isSessionSupported`/generar el USDZ) corre
 * recién adentro — acá sólo se descarta lo obviamente imposible, para
 * no navegar a una página que va a terminar en el mismo fallback de
 * todos modos si esta comprobación barata ya alcanza. */
function irAVerEnAr(): void {
  if (!ultimoPlano) return;
  if (location.protocol === 'file:' || (!tieneNavigatorXr(navigator) && !tieneChanceDeQuickLook())) {
    const t = textosDe(idiomaActual).ar;
    abrirPopup(t.noSoportadoTitulo, t.noSoportadoCuerpo);
    return;
  }
  const estadoAr: EstadoAr = {
    sala: ultimoPlano.sala,
    parlanteIzq: ultimoPlano.disposicion.parlanteIzq,
    parlanteDer: ultimoPlano.disposicion.parlanteDer,
    asiento: ultimoPlano.disposicion.puntoDulce,
    muroFrontalVacio: ultimoPlano.murosVista.frontal === 'vacio',
    muroPosteriorVacio: ultimoPlano.murosVista.posterior === 'vacio',
    muroIzquierdoVacio: ultimoPlano.murosVista.izquierdo === 'vacio',
    muroDerechoVacio: ultimoPlano.murosVista.derecho === 'vacio',
  };
  location.href = 'ar.html?' + codificarEstadoAr(estadoAr);
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

/** `mensajePrefill` opcional — usado por el botón "Avisar al sitio sobre
 * este equipo" del buscador (ver wireFormularioManual) para precargar el
 * mensaje con la marca/modelo que no se pudo resolver. Sin argumento,
 * mismo comportamiento de siempre (formulario vacío). */
function abrirContactoPopup(mensajePrefill?: string): void {
  const dialog = document.getElementById('contacto-popup') as HTMLDialogElement | null;
  const form = document.getElementById('form-contacto') as HTMLFormElement | null;
  const estadoEl = document.getElementById('contacto-estado');
  if (!dialog || !form || !estadoEl) return;
  form.reset();
  if (mensajePrefill) {
    const mensajeEl = document.getElementById('ct-mensaje') as HTMLTextAreaElement | null;
    if (mensajeEl) mensajeEl.value = mensajePrefill;
  }
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

/** Fórmula de proyección isométrica 30° — misma que usa `vista/plano.ts`
 * para el plano de reflexiones real (`sx=(x−y)·cos30, sy=(x+y)·sin30−z`).
 * Reimplementada localmente (no importada) a propósito: acá es puramente
 * decorativa, con proporciones arbitrarias que no representan ninguna sala
 * real, así que acoplarla a la API de `plano.ts` (pensada para `Sala`/
 * `DisposicionSala`) sería una dependencia falsa — el motivo visual es el
 * mismo, no los datos. */
const AMBIENTE_COS30 = Math.sqrt(3) / 2;
const AMBIENTE_SIN30 = 0.5;

function cuboAmbienteSvg(scale: number, ox: number, oy: number, w: number, d: number, h: number): string {
  const p = (x: number, y: number, z: number): [number, number] => [
    ox + (x - y) * AMBIENTE_COS30 * scale,
    oy + (x + y) * AMBIENTE_SIN30 * scale - z * scale,
  ];
  const v = {
    a: p(0, 0, 0),
    b: p(w, 0, 0),
    c: p(w, d, 0),
    e: p(0, d, 0),
    f: p(0, 0, h),
    g: p(w, 0, h),
    h2: p(w, d, h),
    i: p(0, d, h),
  };
  const aristas: [keyof typeof v, keyof typeof v][] = [
    ['a', 'b'], ['b', 'c'], ['c', 'e'], ['e', 'a'],
    ['f', 'g'], ['g', 'h2'], ['h2', 'i'], ['i', 'f'],
    ['a', 'f'], ['b', 'g'], ['c', 'h2'], ['e', 'i'],
  ];
  return aristas
    .map(([p1, p2]) => `<line x1="${v[p1][0].toFixed(1)}" y1="${v[p1][1].toFixed(1)}" x2="${v[p2][0].toFixed(1)}" y2="${v[p2][1].toFixed(1)}" />`)
    .join('');
}

/** Dos cubos de alambre a distinta escala, posicionados a mano para no
 * cruzar el bloque de texto central (verificado con Chrome headless) —
 * uno grande arriba a la derecha, uno chico abajo a la izquierda. */
function pintarFondoAmbiente(): void {
  const svg = document.querySelector('[data-ambient]');
  if (!svg) return;
  const cubos = [
    { scale: 540, ox: 1080, oy: -80, w: 1.6, d: 2.1, h: 1 },
    { scale: 170, ox: 90, oy: 700, w: 1.3, d: 1, h: 0.7 },
  ];
  svg.innerHTML = cubos.map((c) => cuboAmbienteSvg(c.scale, c.ox, c.oy, c.w, c.d, c.h)).join('');
}

function inicializarSplash(): void {
  const ticks = document.getElementById('splash-ticks');
  if (ticks) {
    const alturas = [8, 12, 8, 16, 8, 12, 8, 22, 8, 12, 8, 16, 8, 12, 8];
    for (const h of alturas) {
      const i = document.createElement('i');
      i.style.height = h + 'px';
      ticks.appendChild(i);
    }
  }
  pintarFondoAmbiente();
  iniciarContadorProof();
  const tBoot = textosDe(idiomaActual).splash;
  iniciarBootSplash(tBoot.bootProcesando, tBoot.bootListo);

  // "The Match Recomendado" corre una sola vez, contra la fecha real de
  // carga — determinístico por mes (ver datos/matchDelMes.ts), no depende
  // de nada que el usuario elija todavía.
  matchDelMesCache = elegirMatchDelMes(new Date());
  repintarMatchDelMes();
}

function repintarMatchDelMes(): void {
  pintarMatchDelMes(matchDelMesCache ? modeloMatchDelMes(matchDelMesCache, idiomaActual) : null);
}

/** Cuenta rápido de 0 al valor final de cada `.proof-num` — el sufijo ("+",
 * "%") vive en el propio `data-count-to` y se conserva tal cual, nunca se
 * cuenta. Arranca ~1,1s después de cargar, el mismo momento en que asienta
 * la animación del logo (`.the`/`.hm-base`, ver estilos.css) y en que
 * `.proof` termina su propio fundido — se lee como un solo gesto, no dos
 * animaciones sueltas. Con prefers-reduced-motion va directo al valor
 * final, sin conteo (mismo criterio que el resto de las animaciones del
 * sitio). */
function iniciarContadorProof(): void {
  const numeros = document.querySelectorAll<HTMLElement>('.proof-num[data-count-to]');
  if (!numeros.length) return;
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducido) {
    numeros.forEach((el) => {
      el.textContent = el.dataset.countTo ?? '';
    });
    return;
  }
  const contar = (el: HTMLElement): void => {
    const m = (el.dataset.countTo ?? '').match(/^(\d+)(.*)$/);
    if (!m) return;
    const destino = parseInt(m[1]!, 10);
    const sufijo = m[2] ?? '';
    const inicio = performance.now();
    const duracionMs = 900;
    const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);
    const frame = (ahora: number): void => {
      const t = Math.min(1, (ahora - inicio) / duracionMs);
      el.textContent = Math.round(destino * easeOutQuart(t)) + sufijo;
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  setTimeout(() => numeros.forEach(contar), 1100);
}

/** Resumen de una línea que muestra `<details class="room-toggle">` cuando
 * está colapsado ("Personalizar sala"): dimensiones + muro frontal + piso —
 * suficiente para confirmar que hay un default razonable sin tener que
 * abrirlo. Se llama en cada cambio de dimensión/material y de idioma
 * (los nombres de material están traducidos). */
function actualizarResumenSala(): void {
  const t = textosDe(idiomaActual).config;
  const el = document.getElementById('room-summary-desc');
  if (el) {
    el.textContent = t.resumenSala({
      ancho: num(estado.W, 1, idiomaActual),
      largo: num(estado.L, 1, idiomaActual),
      alto: num(estado.H, 2, idiomaActual),
      muro: t.materiales[estado.muroFrontal],
      piso: t.materiales[estado.piso],
    });
  }
  const vol = document.getElementById('room-summary-vol');
  if (vol) vol.textContent = t.volumenBadge({ m3: num(estado.W * estado.L * estado.H, 2, idiomaActual) });
  // Relación W:L respecto de H — H suele ser la dimensión más chica de una
  // sala doméstica, así que se normaliza a ella (mismo criterio que la
  // referencia visual: "1 : x.xx : y.yy" con el 1 en la más chica).
  const ratio = document.getElementById('v-ratio');
  if (ratio) {
    ratio.textContent = t.relacion({
      w: num(estado.W / estado.H, 2, idiomaActual),
      l: num(estado.L / estado.H, 2, idiomaActual),
    });
  }
}

/** Habilita/deshabilita las pestañas "Documento" y "AR" de .head-nav según
 * si ya existe un análisis real (`ultimoPlano`, misma variable que ya usa
 * irAVerEnAr() para su propio guardia) — evita mostrar un informe vacío o
 * intentar una sesión de AR sin geometría que anclar. "Resultado" no se
 * deshabilita: su estado sin analizar ("Veredicto del análisis", guiones)
 * ya es un placeholder honesto, no un resultado a medias. */
function actualizarNavHabilitada(): void {
  const disponible = ultimoPlano !== null;
  document.querySelectorAll<HTMLButtonElement>('[data-nav-ir="documento"]').forEach((b) => {
    b.disabled = !disponible;
  });
  const btnAr = document.getElementById('btn-nav-ar') as HTMLButtonElement | null;
  if (btnAr) btnAr.disabled = !disponible;
}

function wireEventos(): void {
  document.getElementById('btn-entrar')?.addEventListener('click', () => ir('config'));
  document.getElementById('btn-info-volver-2')?.addEventListener('click', () => ir('results'));
  document.getElementById('btn-guardar')?.addEventListener('click', () => abrirGuardarPopup());

  // Navegación de las 6 secciones (.head-nav, ver estilos.css) — un solo
  // listener delegado por tipo de botón, en vez de uno por pantalla:
  // los 5 destinos alcanzables con ir() comparten el mismo atributo
  // data-nav-ir; AR es un caso aparte (página distinta, con su propio
  // chequeo de soporte ya resuelto en irAVerEnAr()). El resaltado del
  // botón activo (aria-current) lo actualiza ir() mismo, en
  // vista/pantallas.ts — corre para cualquier navegación, no sólo la
  // disparada desde acá.
  document.querySelectorAll<HTMLButtonElement>('.head-nav-btn[data-nav-ir], .cta-sec[data-nav-ir]').forEach((boton) => {
    boton.addEventListener('click', () => ir(boton.dataset.navIr as Pantalla));
  });
  document.getElementById('btn-nav-ar')?.addEventListener('click', () => irAVerEnAr());

  // "Documento" (#s-documento) ahora SÍ tiene una entrada visible (la
  // pestaña "Documento" de arriba) — ya no es una pantalla oculta
  // alcanzable sólo desde la consola. Se habilita recién con un análisis
  // real (ver actualizarNavHabilitada()) para no mostrar un informe vacío
  // a quien todavía no configuró nada. "Análisis 2"/"Comparar"/"Descargar
  // PDF", adentro de esa pantalla, siguen reusando el mismo popup que
  // #btn-guardar.
  document.getElementById('btn-doc-volver-2')?.addEventListener('click', () => ir('results'));
  document.getElementById('btn-doc-comparar')?.addEventListener('click', () => abrirGuardarPopup());
  document.getElementById('btn-doc-pdf')?.addEventListener('click', () => abrirGuardarPopup());
  document.querySelector('[data-doc-tab="2"]')?.addEventListener('click', () => abrirGuardarPopup());

  document.querySelectorAll<HTMLButtonElement>('.infobtn[data-info]').forEach((b) => {
    // Varios infobtn viven ahora dentro de un <summary> (cada fila de
    // evidencia es un <details>) — sin esto, el click abriría el popup Y
    // además togglearía el acordeón, porque el navegador interpreta
    // cualquier click dentro de <summary> como "abrir/cerrar" salvo que se
    // le haga preventDefault().
    b.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      abrirInfoPopup(b.dataset.info as InfoClave);
    });
  });
  const infoPopup = document.getElementById('info-popup') as HTMLDialogElement | null;
  document.getElementById('info-popup-cerrar')?.addEventListener('click', () => infoPopup?.close());
  infoPopup?.addEventListener('click', (e) => {
    if (e.target === infoPopup) infoPopup.close();
  });

  document.getElementById('btn-contacto-splash')?.addEventListener('click', () => abrirContactoPopup());
  document.getElementById('btn-contacto-config')?.addEventListener('click', () => abrirContactoPopup());
  document.getElementById('btn-contacto-config-foot')?.addEventListener('click', () => abrirContactoPopup());
  document.getElementById('btn-contacto-resultado')?.addEventListener('click', () => abrirContactoPopup());
  document.getElementById('btn-contacto-info')?.addEventListener('click', () => abrirContactoPopup());
  document.getElementById('btn-contacto-documento')?.addEventListener('click', () => abrirContactoPopup());
  const contactoPopup = document.getElementById('contacto-popup') as HTMLDialogElement | null;
  document.getElementById('contacto-cerrar')?.addEventListener('click', () => contactoPopup?.close());
  contactoPopup?.addEventListener('click', (e) => {
    if (e.target === contactoPopup) contactoPopup.close();
  });
  document.getElementById('form-contacto')?.addEventListener('submit', enviarContacto);

  wireSlider('in-W', 'W');
  wireSlider('in-L', 'L');
  wireSlider('in-H', 'H');

  document.querySelectorAll<HTMLButtonElement>('.cfg-seg3 button[data-lvl]').forEach((b) => {
    b.addEventListener('click', () => setNivel(b.dataset.lvl as NivelUI));
  });

  document.getElementById('sel-murofrontal')?.addEventListener('change', (e) => setMuroFrontal((e.target as HTMLSelectElement).value as MaterialMuro));
  document.getElementById('sel-muroposterior')?.addEventListener('change', (e) => setMuroPosterior((e.target as HTMLSelectElement).value as MaterialMuro));
  document.getElementById('sel-muroizquierdo')?.addEventListener('change', (e) => setMuroIzquierdo((e.target as HTMLSelectElement).value as MaterialMuro));
  document.getElementById('sel-muroderecho')?.addEventListener('change', (e) => setMuroDerecho((e.target as HTMLSelectElement).value as MaterialMuro));
  document.getElementById('sel-piso')?.addEventListener('change', (e) => setPiso((e.target as HTMLSelectElement).value as MaterialPiso));
  document.getElementById('sel-techo')?.addEventListener('change', (e) => setTecho((e.target as HTMLSelectElement).value as MaterialTecho));

  document.querySelectorAll<HTMLButtonElement>('.cfg-seg3 button[data-genero]').forEach((b) => {
    b.addEventListener('click', () => setGenero(b.dataset.genero as Genero));
  });

  document.querySelectorAll<HTMLButtonElement>('.segs button[data-vista]').forEach((b) => {
    b.addEventListener('click', () => setVistaPlano(b.dataset.vista as Vista));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-pestana]').forEach((b) => {
    b.addEventListener('click', () => activarPestana(b.dataset.pestana as 'original' | 'modificado'));
  });
  document.getElementById('btn-candado')?.addEventListener('click', () => setCandado(!estado.candadoAbierto));
  document.getElementById('btn-ver-ar')?.addEventListener('click', irAVerEnAr);
  // Delegado sobre #plan-hint, no directo sobre #btn-recalcular: ese botón
  // vive dentro de resultado.plano.hintArrastreHtml, que aplicarCromoEstatico()
  // reescribe entero (innerHTML) en cada cambio de idioma — un listener
  // puesto directo sobre el nodo original se perdería ahí. #plan-hint en
  // sí nunca se recrea, sólo su contenido, así que el listener sobrevive
  // (mismo patrón que activarArrastre usa sobre #plan por la misma razón).
  document.getElementById('plan-hint')?.addEventListener('click', (ev) => {
    if ((ev.target as Element | null)?.closest('#btn-recalcular')) recalcular();
  });

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

// Vercel Web Analytics: sin cookies, visitante identificado por un hash
// de la request que se descarta a las 24 h (ver public/privacy.html) —
// nunca corre por file:// (ahí `inject()` intentaría cargar un script
// desde una ruta relativa que no resuelve a ningún host, mismo problema
// ya resuelto para el formulario de contacto en `enviarContacto`).
function inicializarAnalytics(): void {
  if (location.protocol === 'file:') return;
  inicializarVercelAnalytics();
}

function main(): void {
  inicializarAnalytics();
  inicializarSplash();
  aplicarCromoEstatico(idiomaActual);
  wireEventos();
  iniciarBuscadorEquipos();

  const escala = document.getElementById('pw-scale');
  if (escala) construirEscala(escala);

  actualizarTextosDimension();
  actualizarAlfas();
  actualizarBadgesNivelGenero();
  actualizarResumenSala();
  actualizarNavHabilitada();
  refrescar();

  // Hook de devtools, ya no el único camino a "Documento" (tiene su propia
  // pestaña en .head-nav) — se conserva como atajo para saltar la
  // deshabilitación de la pestaña durante pruebas manuales.
  (window as unknown as { ir: typeof ir }).ir = ir;
}

main();
