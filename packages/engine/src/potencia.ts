/**
 * Regla de potencia — ¿el amplificador entrega el SPL de pico que la sala pide?
 * Fórmula, constantes y veredicto: docs/motor-mvp.md sección 2.
 */

import { atenuacionPorDistanciaDb, gananciaPorPotenciaDb, sensibilidadA1WDb, VELOCIDAD_SONIDO_MS } from './unidades.ts';
import { peorConfianza } from './tipos.ts';
import type { Parlante, Amplificador, Confianza } from './tipos.ts';

export type NivelEscucha = 'moderado' | 'alto' | 'referencia';

/** SPL de pico objetivo en el punto de escucha, por nivel. */
export const PICO_OBJETIVO_DB: Record<NivelEscucha, number> = {
  moderado: 90,
  alto: 100,
  referencia: 105,
};

/**
 * Constantes del modelo — supuestos declarados, no datos del equipo. Se
 * verifican midiendo; ver motor-mvp.md sección 2. Corregidas tras una
 * auditoría externa que encontró 7,25 dB de error acumulado en el SPL
 * disponible (tres defectos que se cancelaban parcialmente entre sí, por
 * eso ningún test los detectaba): convención de sensibilidad sin
 * normalizar, potencia a 8 Ω usada siempre aunque el parlante fuera de
 * 4 Ω, y estas dos constantes.
 */

/** +6 dB sólo vale para contenido correlacionado (graves prácticamente
 * mono, donde dos fuentes coherentes suman en presión); el contenido
 * estéreo descorrelacionado — casi toda la música en medios y agudos —
 * suma +3 dB (dominio de potencia, fuentes incoherentes). Antes: 6. */
export const SUMA_PAR_DB = 3;

/** Refuerzo típico de sala pequeña por acumulación de presión — YA NO se
 * suma al SPL de banda ancha (antes sí, sin condición de frecuencia): ese
 * refuerzo aparece físicamente bajo la frecuencia del modo axial mayor de
 * la sala, no en todo el rango. Se expone como información en
 * `ResultadoPotencia` (`gananciaSalaDb`/`frecuenciaGananciaSalaHz`) para
 * que la tarjeta lo declare sin regalarlo en el cómputo general. */
export const GANANCIA_SALA_DB = 3;

export type CodigoPotencia = 'con-margen' | 'justo' | 'insuficiente';

/** Clasifica un margen en severidad+código — extraída para poder aplicarla
 * dos veces (extremo pesimista y, cuando aplica un rango, el optimista) sin
 * duplicar los umbrales en dos lugares. */
function clasificarMargen(margenDb: number): { severidad: 'ok' | 'warn' | 'alert'; codigo: CodigoPotencia } {
  if (margenDb >= 3) return { severidad: 'ok', codigo: 'con-margen' };
  if (margenDb >= 0) return { severidad: 'warn', codigo: 'justo' };
  return { severidad: 'alert', codigo: 'insuficiente' };
}

/** El fabricante recomienda desde `recomendadaW` para este parlante; el
 * amplificador entrega `entregadaW`. El motor no redacta la frase — sólo
 * los números — para no fijar el idioma en el producto; ver CLAUDE.md. */
export interface AvisoPotencia {
  codigo: 'bajo-potencia-recomendada';
  recomendadaW: number;
  entregadaW: number;
}

export interface ResultadoPotencia {
  splDisponibleDb: number;
  margenDb: number;
  severidad: 'ok' | 'warn' | 'alert';
  codigo: CodigoPotencia;
  confianza: Confianza;
  avisos: AvisoPotencia[];
  /** Sensibilidad realmente usada en `splDisponibleDb` — normalizada con
   * `sensibilidadA1WDb` si `sensibilidadConvencion` es '2.83V'; el valor
   * citado tal cual si es '1W'; si es null (no declarada) Y
   * `sensibilidadRangoAplica` (< 8 Ω), el extremo PESIMISTA del rango
   * (ver `sensibilidadEfectivaRangoDb`) — conservador, no el optimista.
   * Si es null y no aplica rango (≥8 Ω), el valor citado tal cual: a esa
   * impedancia 2,83V y 1W difieren <0,01 dB, no hay nada que corregir. */
  sensibilidadEfectivaDb: number;
  /** true si el parlante no tiene `sensibilidadConvencion` declarada. */
  sensibilidadSinConvencion: boolean;
  /** true sólo cuando la ambigüedad de convención puede mover el
   * resultado de verdad: `sensibilidadSinConvencion` Y
   * `impedanciaNominalOhm < 8` — a 8 Ω u más, 2,83V/1m equivale casi
   * exactamente a 1W/1m (2,83²/8≈1), así que ahí la confianza NO se
   * degrada y no hay rango que mostrar: sería ruido sobre un dato que en
   * la práctica no tiene ambigüedad. */
  sensibilidadRangoAplica: boolean;
  /** [pesimista, optimista] de sensibilidadEfectivaDb cuando
   * `sensibilidadRangoAplica` es true; null si no aplica. Pesimista =
   * `sensibilidadA1WDb(valor, Z)` (si la fuente citó a 2,83V); optimista
   * = el valor citado tal cual (si ya estaba a 1W). `splDisponibleDb`/
   * `margenDb` usan el extremo pesimista; estos rangos son para que la
   * tarjeta declare el mejor caso también, en vez de un solo número. */
  sensibilidadEfectivaRangoDb: [number, number] | null;
  /** [pesimista, optimista] de splDisponibleDb — mismo criterio. */
  splDisponibleRangoDb: [number, number] | null;
  /** [pesimista, optimista] de margenDb — mismo criterio. */
  margenRangoDb: [number, number] | null;
  /** `codigo` que resultaría con el extremo OPTIMISTA de `margenRangoDb`
   * en vez del pesimista que ya usa `codigo` — null si `margenRangoDb` es
   * null. Compararlo con `codigo` dice si el rango de sensibilidad cruza
   * un umbral de severidad. */
  codigoRangoOptimista: CodigoPotencia | null;
  /** true cuando `codigoRangoOptimista` difiere de `codigo` — el veredicto
   * mismo depende de un dato de catálogo que falta (la convención de
   * sensibilidad), no de una propiedad del sistema. La UI declara los dos
   * códigos en vez de mostrar sólo el pesimista como si fuera el único
   * resultado posible. */
  margenCruzaUmbral: boolean;
  /** Potencia realmente usada en `splDisponibleDb` (8 Ω o 4 Ω según la
   * impedancia nominal del parlante y qué dato tenga el amplificador). */
  potenciaUsadaW: number;
  /** true si el parlante es de impedancia nominal ≤4 Ω pero el amplificador
   * no publica `potencia4OhmW` — se usó `potencia8OhmW` como aproximación,
   * declarada como tal en vez de asumida en silencio. */
  potenciaDeCargaEstimada: boolean;
  /** Refuerzo de sala pequeña, puramente informativo — no está sumado en
   * `splDisponibleDb` (ver GANANCIA_SALA_DB). Sólo relevante por debajo de
   * `frecuenciaGananciaSalaHz`. */
  gananciaSalaDb: number;
  /** Frecuencia del modo axial de la dimensión mayor de la sala — techo por
   * debajo del cual `gananciaSalaDb` aplica. f = 343 / (2·dimensionMayorSalaM). */
  frecuenciaGananciaSalaHz: number;
}

export function evaluarPotencia(
  parlante: Parlante,
  amplificador: Amplificador,
  distanciaM: number,
  nivel: NivelEscucha,
  dimensionMayorSalaM: number
): ResultadoPotencia {
  // Cambio 1: normalizar la convención de sensibilidad — nunca se asume
  // una convención en silencio cuando la fuente no la declara. Cuando la
  // convención falta Y la impedancia es <8Ω (donde 2,83V/1W sí difieren
  // de forma audible), en vez de asumir un extremo se calculan los dos y
  // el punto usado para severidad/margen es el pesimista — conservador,
  // no un "sello genérico" de baja confianza sin magnitud ni dirección.
  const sensibilidadSinConvencion = parlante.sensibilidadConvencion === null;
  const sensibilidadRangoAplica = sensibilidadSinConvencion && parlante.impedanciaNominalOhm < 8;

  let sensibilidadEfectivaDb: number;
  let sensibilidadEfectivaRangoDb: [number, number] | null = null;
  if (parlante.sensibilidadConvencion === '2.83V') {
    sensibilidadEfectivaDb = sensibilidadA1WDb(parlante.sensibilidadDb.valor, parlante.impedanciaNominalOhm);
  } else if (sensibilidadRangoAplica) {
    const pesimista = sensibilidadA1WDb(parlante.sensibilidadDb.valor, parlante.impedanciaNominalOhm);
    const optimista = parlante.sensibilidadDb.valor;
    sensibilidadEfectivaRangoDb = [pesimista, optimista];
    sensibilidadEfectivaDb = pesimista;
  } else {
    // '1W' ya normalizada, o null a ≥8Ω donde no hay ambigüedad real: se
    // usa el valor citado tal cual.
    sensibilidadEfectivaDb = parlante.sensibilidadDb.valor;
  }

  // Cambio 2: usar la potencia de la carga real (4 Ω) cuando el parlante
  // es de esa impedancia nominal y el amplificador publica ese dato —
  // carga.ts sigue usando el ratio p4/p8 para reserva de corriente, otra
  // pregunta distinta que esto no toca.
  let potenciaUsadaW: number;
  let potenciaUsadaConfianza: Confianza;
  let potenciaDeCargaEstimada = false;
  if (parlante.impedanciaNominalOhm <= 4 && amplificador.potencia4OhmW !== null) {
    potenciaUsadaW = amplificador.potencia4OhmW.valor;
    potenciaUsadaConfianza = amplificador.potencia4OhmW.confianza;
  } else if (parlante.impedanciaNominalOhm <= 4) {
    potenciaUsadaW = amplificador.potencia8OhmW.valor;
    potenciaUsadaConfianza = amplificador.potencia8OhmW.confianza;
    potenciaDeCargaEstimada = true;
  } else {
    potenciaUsadaW = amplificador.potencia8OhmW.valor;
    potenciaUsadaConfianza = amplificador.potencia8OhmW.confianza;
  }

  // Cambio 3: SUMA_PAR_DB corregido arriba; GANANCIA_SALA_DB ya no entra
  // en el cómputo general, sólo se expone como información con su techo
  // de frecuencia (modo axial de la dimensión mayor de la sala).
  const gananciaSalaDb = GANANCIA_SALA_DB;
  const frecuenciaGananciaSalaHz = VELOCIDAD_SONIDO_MS / (2 * dimensionMayorSalaM);

  const terminoComun = -atenuacionPorDistanciaDb(distanciaM) + gananciaPorPotenciaDb(potenciaUsadaW) + SUMA_PAR_DB;
  const splDisponibleDb = sensibilidadEfectivaDb + terminoComun;
  const margenDb = splDisponibleDb - PICO_OBJETIVO_DB[nivel];

  // Mismo desplazamiento (distancia/potencia/SUMA_PAR_DB/pico) aplicado a
  // los dos extremos de sensibilidadEfectivaRangoDb — splDisponibleDb/
  // margenDb de arriba ya son el extremo pesimista de este mismo rango.
  const splDisponibleRangoDb: [number, number] | null = sensibilidadEfectivaRangoDb
    ? [sensibilidadEfectivaRangoDb[0] + terminoComun, sensibilidadEfectivaRangoDb[1] + terminoComun]
    : null;
  const margenRangoDb: [number, number] | null = splDisponibleRangoDb
    ? [splDisponibleRangoDb[0] - PICO_OBJETIVO_DB[nivel], splDisponibleRangoDb[1] - PICO_OBJETIVO_DB[nivel]]
    : null;

  const { severidad, codigo } = clasificarMargen(margenDb);

  // El extremo optimista puede caer en OTRO código que el pesimista — ahí
  // el veredicto mismo es incierto por falta del dato de convención, no
  // una propiedad del sistema (ver margenCruzaUmbral en la interfaz).
  const codigoRangoOptimista: CodigoPotencia | null = margenRangoDb ? clasificarMargen(margenRangoDb[1]).codigo : null;
  const margenCruzaUmbral = codigoRangoOptimista !== null && codigoRangoOptimista !== codigo;

  const avisos: AvisoPotencia[] = [];
  if (
    parlante.potenciaRecMinW !== null &&
    amplificador.potencia8OhmW.valor < parlante.potenciaRecMinW
  ) {
    avisos.push({
      codigo: 'bajo-potencia-recomendada',
      recomendadaW: parlante.potenciaRecMinW,
      entregadaW: amplificador.potencia8OhmW.valor,
    });
  }

  // Confianza: la peor entre sensibilidad y la potencia REALMENTE usada
  // (4 Ω u 8 Ω, cambio 2) — degradada a 'baja' sólo cuando la convención
  // faltante puede mover el resultado de verdad (sensibilidadRangoAplica,
  // <8Ω). A 8Ω u más, no degrada: castigar ahí un dato que en la práctica
  // no tiene ambigüedad (2,83V≈1W) diluiría la señal justo donde sí
  // importa — la magnitud/dirección de la incertidumbre ya queda
  // declarada en sensibilidadEfectivaRangoDb/margenRangoDb, no en un
  // sello genérico de confianza.
  const confianzaDatos = peorConfianza(parlante.sensibilidadDb.confianza, potenciaUsadaConfianza);
  const confianza: Confianza = sensibilidadRangoAplica ? 'baja' : confianzaDatos;

  return {
    splDisponibleDb,
    margenDb,
    severidad,
    codigo,
    confianza,
    avisos,
    sensibilidadEfectivaDb,
    sensibilidadSinConvencion,
    sensibilidadRangoAplica,
    sensibilidadEfectivaRangoDb,
    splDisponibleRangoDb,
    margenRangoDb,
    codigoRangoOptimista,
    margenCruzaUmbral,
    potenciaUsadaW,
    potenciaDeCargaEstimada,
    gananciaSalaDb,
    frecuenciaGananciaSalaHz,
  };
}
