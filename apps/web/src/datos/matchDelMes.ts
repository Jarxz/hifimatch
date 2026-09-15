/**
 * "The Match Recomendado" — un solo sistema (parlante + amplificador +
 * streamer/dac cuando hay uno compatible), elegido por el propio motor
 * entre TODO el catálogo real, que rota una vez por mes de forma
 * determinística (sin backend, sin lista a mano: el índice sale de la
 * fecha, así que un catálogo que crece cambia la rotación solo).
 *
 * CAPA CRITERIO-EDITORIAL, igual dualidad que `veredicto.ts`: qué
 * combinación mostrar este mes (y con qué sala) es una decisión de este
 * sitio; el veredicto físico que se muestra sobre esa combinación es
 * 100% el mismo cálculo que corre en "Analizar" — cero lógica de
 * evaluación nueva, sólo orquestación sobre `packages/engine`.
 *
 * ## Por qué no puede ser "totalmente compatible"
 *
 * Se investigó (ver CLAUDE.md, ronda de esta función) si existía alguna
 * sala donde el grupo "Sala" del veredicto diera `ok` — no existe
 * ninguna. La reflexión de PISO tiene un "nulo" de filtro peine que cae
 * siempre en la zona audible (200-2000 Hz) para CUALQUIER dimensión de
 * sala: la distancia parlante↔oído en la disposición automática es una
 * función fija del ancho (no del largo ni del alto), y con la altura de
 * oído/parlante fija en 1,0 m (`ALTURA_ESCUCHA_M`, constante del motor),
 * el álgebra da un nulo entre ~204 y ~360 Hz sin importar el ancho
 * elegido — y ningún material de piso disponible (hormigón/madera
 * laminado/porcelanato/alfombra) tiene coeficiente de absorción
 * suficiente ahí (la alfombra, el mejor caso, da 0,14 justo debajo del
 * umbral de 0,15). Es un límite real del modelo, no de qué sala elegir.
 *
 * Por eso el criterio de selección es el mejor resultado que el motor
 * puede dar de verdad: Potencia y Acople eléctrico en `ok`, con Sala en
 * `warn` (ese límite ya explicado) — "Configuración soportada, con
 * límites", nunca "totalmente compatible".
 */
import { calcularDisposicion } from '../../../../packages/engine/src/sala.ts';
import type { Sala } from '../../../../packages/engine/src/sala.ts';
import { evaluarModos, evaluarNuloEscucha, evaluarAcoplamientoModal } from '../../../../packages/engine/src/modos.ts';
import { evaluarReverberacion } from '../../../../packages/engine/src/reverberacion.ts';
import type { Materiales } from '../../../../packages/engine/src/reverberacion.ts';
import { evaluarFiltroPeine, evaluarAsimetria, evaluarAnguloEscucha } from '../../../../packages/engine/src/colocacion.ts';
import { evaluarPotencia } from '../../../../packages/engine/src/potencia.ts';
import type { NivelEscucha } from '../../../../packages/engine/src/potencia.ts';
import { evaluarCarga } from '../../../../packages/engine/src/carga.ts';
import { evaluarAmortiguamiento } from '../../../../packages/engine/src/amortiguamiento.ts';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from '../../../../packages/engine/src/ganancia.ts';
import { calcularVeredicto } from '../../../../packages/engine/src/veredicto.ts';
import type { ResultadoVeredicto, EntradaVeredicto } from '../../../../packages/engine/src/veredicto.ts';
import type { Severidad } from '../../../../packages/engine/src/tipos.ts';
import { CATALOGO, MARCA_GENERICA } from '../../../../packages/data/src/catalogo.ts';
import type { FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import { parlanteDelCatalogo, amplificadorDelCatalogo, fuenteDelCatalogo } from './adaptadores.ts';

/**
 * Sala de referencia — NUNCA la sala por defecto del sitio (esa da `warn`
 * en Modos a propósito, por una coincidencia 3:2 declarada en
 * CLAUDE.md). Verificada por cómputo directo contra el motor: da `ok`
 * en modos/nulo/acoplamiento/asimetría/ángulo — sólo el piso, por el
 * límite estructural explicado arriba, queda en `warn`.
 */
export const SALA_REFERENCIA: Sala = { anchoM: 3.8, largoM: 4.5, altoM: 2.5 };

export const MATERIALES_REFERENCIA: Materiales = {
  muroFrontal: 'panelAcustico',
  muroPosterior: 'panelAcustico',
  muroIzquierdo: 'panelAcustico',
  muroDerecho: 'panelAcustico',
  piso: 'alfombra',
  techo: 'panelAcustico',
};

/** Nivel de escucha "moderado" — el menos exigente de los tres, el que
 * más margen de potencia deja: da la rotación con más variedad real de
 * candidatos mes a mes, en vez de reducir el pool a los amplificadores
 * más potentes del catálogo. Declarado en la ficha, no escondido. */
export const NIVEL_REFERENCIA: NivelEscucha = 'moderado';

export interface MatchDelMes {
  parlanteId: string;
  amplificadorId: string;
  streamerId: string | null;
  dacId: string | null;
  veredicto: ResultadoVeredicto;
  anio: number;
  mes: number; // 0-11, como Date.getMonth()
}

function aceptable(s: Severidad): boolean {
  return s === 'ok' || s === 'sin-datos';
}

/** Todo lo que depende SÓLO de la sala de referencia (nunca del equipo
 * elegido) — se calcula una única vez, nunca por candidato. */
interface BundleSala {
  disp: ReturnType<typeof calcularDisposicion>;
  dimensionMayorSalaM: number;
  entradaSala: Pick<EntradaVeredicto, 'modos' | 'reverberacion' | 'acoplamientoModal' | 'filtroPeine' | 'asimetria' | 'anguloEscucha'>;
}

function calcularBundleSala(): BundleSala {
  const disp = calcularDisposicion(SALA_REFERENCIA);
  const dimensionMayorSalaM = Math.max(SALA_REFERENCIA.anchoM, SALA_REFERENCIA.largoM, SALA_REFERENCIA.altoM);

  const resModos = evaluarModos(SALA_REFERENCIA);
  const resNulo = evaluarNuloEscucha(SALA_REFERENCIA, disp.puntoDulce.y);
  const modos: 'ok' | 'warn' = resModos.severidad === 'warn' || resNulo.severidad === 'warn' ? 'warn' : 'ok';

  // Mismo criterio que construirSnapshot() en main.ts: se evalúan los dos
  // canales y se propaga el peor (comparando el producto máximo de cada
  // uno, que es monótono con la severidad).
  const resAcopIzq = evaluarAcoplamientoModal(SALA_REFERENCIA, disp.parlanteIzq.y, disp.puntoDulce.y);
  const resAcopDer = evaluarAcoplamientoModal(SALA_REFERENCIA, disp.parlanteDer.y, disp.puntoDulce.y);
  const maxProdIzq = Math.max(...resAcopIzq.modos.map((m) => m.producto));
  const maxProdDer = Math.max(...resAcopDer.modos.map((m) => m.producto));
  const acoplamientoModal = (maxProdIzq >= maxProdDer ? resAcopIzq : resAcopDer).severidad;

  const resReverb = evaluarReverberacion(SALA_REFERENCIA, MATERIALES_REFERENCIA);

  const resFiltro = evaluarFiltroPeine(disp, MATERIALES_REFERENCIA);
  const filtroPeine: 'ok' | 'warn' = resFiltro.some((f) => f.severidad === 'warn') ? 'warn' : 'ok';

  const resAsim = evaluarAsimetria(disp);
  const asimetria: 'ok' | 'warn' = resAsim.some((a) => a.severidad === 'warn') ? 'warn' : 'ok';

  const resAngulo = evaluarAnguloEscucha(disp);

  return {
    disp,
    dimensionMayorSalaM,
    entradaSala: {
      modos,
      reverberacion: resReverb.severidad,
      acoplamientoModal,
      filtroPeine,
      anguloEscucha: resAngulo.severidad,
      asimetria,
    },
  };
}

/** Puente + recorrido de una fuente (streamer o DAC) contra un
 * amplificador ya adaptado — la misma pregunta para las dos categorías,
 * ver tipos.ts `Fuente`. */
function fuenteCompatible(fCat: FuenteCat, ampM: ReturnType<typeof amplificadorDelCatalogo>): boolean {
  const fM = fuenteDelCatalogo(fCat, 'es');
  return evaluarPuenteImpedancias(fM, ampM).severidad === 'ok' && evaluarRecorridoVolumen(fM, ampM).severidad === 'ok';
}

/**
 * Elige el match del mes para `fecha` — pura función de la fecha y del
 * catálogo vigente (nunca lee `Date.now()` internamente: quien llama
 * decide qué fecha usar, así que es 100% determinística y testeable).
 * `null` sólo si, contra el catálogo actual, ningún amplificador real
 * tiene al menos un parlante compatible — caso límite, no esperado con
 * el catálogo de hoy.
 */
export function elegirMatchDelMes(fecha: Date): MatchDelMes | null {
  const bundle = calcularBundleSala();

  const parlantesReales = CATALOGO.parlantes.filter((p) => p.marca !== MARCA_GENERICA);
  const amplificadoresReales = CATALOGO.amplificadores.filter((a) => a.marca !== MARCA_GENERICA);

  interface Candidato {
    amplificadorId: string;
    parlantesOk: string[];
    streamersOk: string[];
    dacsOk: string[];
  }
  const candidatos: Candidato[] = [];

  for (const aCat of amplificadoresReales) {
    const ampM = amplificadorDelCatalogo(aCat, 'es');

    const parlantesOk: string[] = [];
    for (const pCat of parlantesReales) {
      const parlanteM = parlanteDelCatalogo(pCat, 'es');
      const resPot = evaluarPotencia(
        parlanteM,
        ampM,
        bundle.disp.distanciaEscuchaIzqM,
        bundle.disp.distanciaEscuchaDerM,
        NIVEL_REFERENCIA,
        bundle.dimensionMayorSalaM
      );
      if (resPot.severidad !== 'ok') continue;
      if (evaluarCarga(parlanteM, ampM).severidad !== 'ok') continue;
      // Amortiguamiento: 'sin-datos' se acepta a propósito — ningún
      // amplificador real del catálogo tiene factorAmortiguamiento
      // publicado todavía (ver CLAUDE.md), exigir 'ok' estricto acá
      // dejaría esta función sin ningún candidato posible siempre.
      if (!aceptable(evaluarAmortiguamiento(parlanteM, ampM).severidad)) continue;
      parlantesOk.push(pCat.id);
    }
    if (parlantesOk.length === 0) continue; // sin parlante compatible, este ampli no arma sistema

    const streamersOk = CATALOGO.streamers.filter((s) => fuenteCompatible(s, ampM)).map((s) => s.id);
    const dacsOk = CATALOGO.dacs.filter((d) => fuenteCompatible(d, ampM)).map((d) => d.id);

    candidatos.push({
      amplificadorId: aCat.id,
      parlantesOk: [...parlantesOk].sort(),
      streamersOk: [...streamersOk].sort(),
      dacsOk: [...dacsOk].sort(),
    });
  }

  if (candidatos.length === 0) return null;
  candidatos.sort((a, b) => a.amplificadorId.localeCompare(b.amplificadorId));

  const anio = fecha.getFullYear();
  const mes = fecha.getMonth();
  const base = anio * 12 + mes;
  const indice = ((base % candidatos.length) + candidatos.length) % candidatos.length; // nunca negativo
  const elegido = candidatos[indice]!;

  const parlanteId = elegido.parlantesOk[0]!;
  const streamerId = elegido.streamersOk[0] ?? null;
  const dacId = elegido.dacsOk[0] ?? null;

  // Se recalcula el veredicto completo para ESTA combinación específica
  // (transparencia: el badge que se muestra es el resultado real de
  // calcularVeredicto(), no una suposición a partir de los filtros de
  // arriba).
  const parlanteCat = parlantesReales.find((p) => p.id === parlanteId)!;
  const ampCat = amplificadoresReales.find((a) => a.id === elegido.amplificadorId)!;
  const parlanteM = parlanteDelCatalogo(parlanteCat, 'es');
  const ampM = amplificadorDelCatalogo(ampCat, 'es');

  const resPot = evaluarPotencia(
    parlanteM,
    ampM,
    bundle.disp.distanciaEscuchaIzqM,
    bundle.disp.distanciaEscuchaDerM,
    NIVEL_REFERENCIA,
    bundle.dimensionMayorSalaM
  );
  const resCarga = evaluarCarga(parlanteM, ampM);
  const resAmort = evaluarAmortiguamiento(parlanteM, ampM);

  let puenteStreamer: Severidad | null = null;
  let recorridoStreamer: Severidad | null = null;
  if (streamerId) {
    const sCat = CATALOGO.streamers.find((s) => s.id === streamerId)!;
    const fM = fuenteDelCatalogo(sCat, 'es');
    puenteStreamer = evaluarPuenteImpedancias(fM, ampM).severidad;
    recorridoStreamer = evaluarRecorridoVolumen(fM, ampM).severidad;
  }
  let puenteDac: Severidad | null = null;
  let recorridoDac: Severidad | null = null;
  if (dacId) {
    const dCat = CATALOGO.dacs.find((d) => d.id === dacId)!;
    const fM = fuenteDelCatalogo(dCat, 'es');
    puenteDac = evaluarPuenteImpedancias(fM, ampM).severidad;
    recorridoDac = evaluarRecorridoVolumen(fM, ampM).severidad;
  }

  const veredicto = calcularVeredicto({
    potencia: resPot.severidad,
    carga: resCarga.severidad,
    amortiguamiento: resAmort.severidad,
    puenteStreamer,
    recorridoStreamer,
    puenteDac,
    recorridoDac,
    ...bundle.entradaSala,
  });

  return { parlanteId, amplificadorId: elegido.amplificadorId, streamerId, dacId, veredicto, anio, mes };
}
