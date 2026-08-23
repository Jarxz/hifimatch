/**
 * Tiempo de reverberación estimado (RT60) — modelo multibanda (125/500/2000
 * Hz, terceras de octava representativas de graves/medios/agudos), con la
 * absorción de cada banda sumada superficie por superficie (A_banda =
 * Σ α_banda,i · S_i, nunca un coeficiente único para toda la sala ni para
 * un "muro" genérico — cada muro se orienta y se declara aparte) y su
 * propia fórmula:
 *
 * - ᾱ_banda ≤ 0,20 → ecuación de Sabine (Wallace Clement Sabine, 1898):
 *   RT60 = 0,161·V / A
 * - ᾱ_banda > 0,20 → ecuación de Eyring (Carl Eyring, 1930):
 *   RT60 = 0,161·V / (−S_total·ln(1−ᾱ))
 *   Sabine sobreestima el RT60 en salas muy absorbentes — cuando ᾱ→1 el
 *   RT60 de Sabine tiende a un valor finito (físicamente imposible: una
 *   sala perfectamente absorbente tiene RT60=0), mientras que Eyring sí
 *   tiende a 0. 0,20 es el umbral de cruce que recomienda la literatura de
 *   acústica arquitectónica (ej. Egan, "Architectural Acoustics") para
 *   cuándo la sobreestimación de Sabine empieza a ser significativa — no
 *   una convención inventada por el sitio.
 *
 * ## El RT60 ya no emite veredicto — es un rango, no un punto
 *
 * Una auditoría externa corrió el motor sobre 17.784 salas plausibles y
 * encontró que este modelo, con sólo las seis superficies desnudas (sin
 * sofá, cortinas, biblioteca — la mayor parte de la absorción real en
 * medios/agudos de una sala doméstica), daba `rt60-largo` en el 100% de
 * las salas: un semáforo que casi siempre dice lo mismo no informa nada.
 *
 * Agregar el mueble no arregla la regla, le da vuelta el signo: con un
 * amoblado normal plausible el veredicto pasa a `rt60-ok` en el 100% de
 * las salas, y como el volumen y la absorción del contenido crecen los dos
 * con la superficie de piso, se cancelan — el RT60 estimado termina
 * dependiendo casi sólo de la altura del techo, un control que el usuario
 * tiene que adivinar, no la sala. Conclusión: el RT60 estimado no da para
 * veredicto, sólo para estimación declarada.
 *
 * Por eso `evaluarReverberacion` calcula **dos escenarios** — `vacio`
 * (sólo las seis superficies) y `amoblado` (superficies + un término de
 * contenido en sabines/m² de piso, `CONTENIDO_SABINES_M2_PISO`, criterio
 * de este sitio, no una medición) — y expone el resultado como
 * `rt60RangoS`, nunca como un solo número con semáforo. `severidad` es
 * siempre `'sin-datos'`: se reutiliza a propósito la semántica que
 * `veredicto.ts` ya tiene probada para "esto no cuenta como reparo, falta
 * medir" — acá lo que falta es justamente eso, una medición real, así que
 * la semántica es correcta y no un truco para esquivar el problema.
 *
 * ## Límite de dominio de Sabine/Eyring — por encima de ᾱ≈0,8, ningún número
 *
 * Sabine y Eyring asumen los dos un **campo sonoro difuso**: energía
 * rebotando muchas veces antes de absorberse, lo bastante como para que
 * "promediar" tenga sentido. Ese supuesto deja de sostenerse mucho antes
 * de que ᾱ llegue a 1 — con `ALPHA_CAMPO_DIFUSO_MAX = 0,8`, la energía se
 * absorbe en uno o dos rebotes, no hay campo difuso que promediar, y
 * ninguna de las dos fórmulas describe ya la sala (Eyring en particular:
 * sigue siendo matemáticamente evaluable hasta ᾱ<1, pero física ya no).
 * Por eso, cuando ᾱ de una banda supera ese umbral, esa banda no reporta
 * un RT60 (`rt60S: null`, `metodo: 'fuera-de-dominio'`) en vez de un
 * número que technically no explota pero que ya no significa nada —
 * mismo argumento que retirar el veredicto del RT60 más arriba, aplicado
 * ahora al número en sí, no sólo a su semáforo. Como el contenido
 * (`amoblado`) sólo agrega absorción sobre la estructura (`vacio`), ᾱ del
 * escenario amoblado es siempre ≥ ᾱ del escenario vacío en la misma banda
 * — así que si el escenario vacío ya está fuera de dominio, el amoblado
 * también lo está.
 *
 * Mismo modelo simplificado que sala.ts/modos.ts en lo demás: sala rígida
 * y rectangular — ver CLAUDE.md, "Severidad y bloque de sala".
 */
import type { Sala } from './sala.ts';

export type MaterialMuro = 'hormigon' | 'vidrio' | 'madera' | 'yesoCarton' | 'panelAcustico' | 'vacio';
export type MaterialPiso = 'hormigon' | 'maderaLaminado' | 'porcelanato' | 'alfombra';
export type MaterialTecho = 'hormigon' | 'madera' | 'yesoCarton' | 'panelAcustico';

export interface Materiales {
  muroFrontal: MaterialMuro;
  muroPosterior: MaterialMuro;
  muroIzquierdo: MaterialMuro;
  muroDerecho: MaterialMuro;
  piso: MaterialPiso;
  techo: MaterialTecho;
}

/** [125 Hz, 500 Hz, 2000 Hz]. */
export type CoefBandas = readonly [number, number, number];

export const BANDAS_HZ = [125, 500, 2000] as const;
export type BandaHz = (typeof BANDAS_HZ)[number];

/**
 * Coeficientes de absorción de Sabine por tercio de octava — criterio del
 * sitio, valores típicos de literatura de acústica arquitectónica (no una
 * medición de la sala real, se verifica midiendo con un decibelímetro o una
 * app de RT60). Hormigón/vidrio/cerámica son muy reflectantes y bastante
 * planos en frecuencia; madera y placas sobre bastidor resuenan más en
 * graves (125 Hz) que en agudos; panel acústico y alfombra son los únicos
 * con absorción alta, y crece con la frecuencia (típico de espumas/fieltros
 * porosos, que absorben mejor agudos que graves).
 *
 * `vacio` (muro abierto) usa α=1,0 en las tres bandas: coeficiente de
 * referencia histórico de Sabine para una abertura — por definición nada de
 * lo que llega ahí vuelve a la sala, en ninguna frecuencia.
 */
export const ABSORCION_MURO_BANDAS: Record<MaterialMuro, CoefBandas> = {
  hormigon: [0.01, 0.02, 0.02],
  vidrio: [0.35, 0.18, 0.07],
  madera: [0.15, 0.1, 0.08],
  yesoCarton: [0.29, 0.1, 0.04],
  panelAcustico: [0.25, 0.85, 0.9],
  vacio: [1.0, 1.0, 1.0],
};

/**
 * "Hormigón" reusa exactamente el triple de `ABSORCION_MURO_BANDAS` — es la
 * misma superficie física (hormigón expuesto), y en el modelo de Sabine la
 * orientación (muro/piso/techo) no cambia el coeficiente de absorción de un
 * material. "Madera laminado" (piso flotante sobre contrapiso) y
 * "Porcelanato" (cerámica) no tenían un triple publicado directamente: se
 * completaron con el mismo criterio de "literatura típica" que ya regía el
 * resto de la tabla — madera laminado absorbe menos que un panelado de
 * madera en muro (montaje más rígido, menos resonancia de panel);
 * porcelanato es tan reflectante y plano como el hormigón.
 */
export const ABSORCION_PISO_BANDAS: Record<MaterialPiso, CoefBandas> = {
  hormigon: [0.01, 0.02, 0.02],
  maderaLaminado: [0.04, 0.07, 0.06],
  porcelanato: [0.01, 0.01, 0.02],
  alfombra: [0.02, 0.14, 0.6],
};

/** Reusa `ABSORCION_MURO_BANDAS` para los 4 materiales de techo — mismos
 * materiales físicos, misma absorción en el modelo de Sabine sin importar
 * la orientación de la superficie. */
export const ABSORCION_TECHO_BANDAS: Record<MaterialTecho, CoefBandas> = {
  hormigon: ABSORCION_MURO_BANDAS.hormigon,
  madera: ABSORCION_MURO_BANDAS.madera,
  yesoCarton: ABSORCION_MURO_BANDAS.yesoCarton,
  panelAcustico: ABSORCION_MURO_BANDAS.panelAcustico,
};

/** Umbral de ᾱ (coeficiente de absorción promedio de la sala) sobre el cual
 * Sabine deja de ser confiable y se usa Eyring — ver comentario de cabecera.
 * Criterio de literatura de acústica arquitectónica, no inventado por el
 * sitio (a diferencia de otros umbrales de este motor, como el 2%/150 Hz de
 * modos.ts, que sí son criterio propio declarado como tal). */
export const UMBRAL_EYRING_ALPHA = 0.2;

/** Los dos escenarios de contenido que se calculan siempre — no un tercero
 * "intermedio" a elegir: la sala real de cada usuario cae en algún punto
 * entre estos dos, y mostrar el rango completo es más honesto que elegir
 * un punto intermedio arbitrario. */
export type EscenarioContenido = 'vacio' | 'amoblado';

/**
 * Absorción adicional por el contenido de la sala (mobiliario, cortinas,
 * biblioteca, alfombras sueltas, personas) — en sabines por m² de
 * superficie de PISO, no una medición. **Criterio del sitio, no una tabla
 * publicada**: calibrado para que una sala doméstica amoblada corriente
 * caiga en un rango de escucha crítica razonable; el orden de magnitud es
 * consistente con la literatura (un sofá de tres cuerpos aporta del orden
 * de 3 sabines a 500 Hz — con ~8-18 m² de piso típicos en una sala de
 * escucha, 0,45 sabines/m² da ese orden de magnitud), pero no sale de una
 * tabla de referencia y se verifica midiendo. `vacio` es literalmente cero
 * — el escenario "sólo las seis superficies", sin nada adentro.
 */
export const CONTENIDO_SABINES_M2_PISO: Record<EscenarioContenido, CoefBandas> = {
  vacio: [0, 0, 0],
  amoblado: [0.18, 0.45, 0.6],
};

export type CodigoReverberacion = 'rt60-estimado' | 'rt60-fuera-de-dominio';

export interface BandaReverberacion {
  hz: BandaHz;
  alphaBar: number;
  /** `null` cuando `alphaBar` supera `ALPHA_CAMPO_DIFUSO_MAX` — ver
   * comentario de cabecera del archivo: ni Sabine ni Eyring aplican ya,
   * así que no hay un número que reportar para esta banda. */
  rt60S: number | null;
  metodo: 'sabine' | 'eyring' | 'fuera-de-dominio';
}

export interface ResultadoReverberacion {
  volumenM3: number;
  superficieFrontalM2: number;
  superficiePosteriorM2: number;
  superficieIzquierdaM2: number;
  superficieDerechaM2: number;
  superficiePisoM2: number;
  superficieTechoM2: number;
  superficieTotalM2: number;
  /** Desglose superficie×superficie a 500 Hz — sólo estructura (muros,
   * piso, techo), sin el término de contenido. Banda de referencia para el
   * detalle "calc" de la tarjeta; el panorama de las 3 bandas completas
   * vive en `bandas`/`bandasVacio`. */
  absorcionFrontalSabines: number;
  absorcionPosteriorSabines: number;
  absorcionIzquierdaSabines: number;
  absorcionDerechaSabines: number;
  absorcionPisoSabines: number;
  absorcionTechoSabines: number;
  /** Suma de las 6 superficies a 500 Hz — sólo estructura, sin contenido. */
  absorcionTotalSabines: number;
  /** Aporte del contenido (mobiliario) a 500 Hz, escenario `amoblado` — ver
   * `CONTENIDO_SABINES_M2_PISO`. Cero en el escenario `vacio` (no se
   * expone aparte porque siempre es 0 por definición). */
  absorcionContenidoSabines: number;
  /** Panorama de las 3 bandas, escenario `amoblado` — el que gobierna
   * `rt60S`/`frecuenciaSchroederHz` (el extremo realista). */
  bandas: BandaReverberacion[];
  /** Mismo panorama, escenario `vacio` (caja desnuda, sin contenido) — el
   * otro extremo del rango. */
  bandasVacio: BandaReverberacion[];
  /** RT60 del escenario `amoblado` — promedio de bandas 500 Hz y 2000 Hz.
   * Es el extremo realista de `rt60RangoS`, no una medición. `null` cuando
   * cualquiera de las dos bandas quedó fuera del dominio de Sabine/Eyring
   * (ver `ALPHA_CAMPO_DIFUSO_MAX`) — no se promedia con la banda que sí
   * dio número, para no fabricar una cifra parcialmente inventada. */
  rt60S: number | null;
  /** [amoblado, vacío] — el amoblado es el extremo menor (más absorción →
   * RT60 más corto), cuando ambos existen. Ninguno de los dos es una
   * medición de la sala real; ver el comentario de cabecera y
   * `CONTENIDO_SABINES_M2_PISO`. Por monotonía (el contenido sólo agrega
   * absorción), si el extremo vacío es `null` el amoblado también lo es
   * — nunca al revés. */
  rt60RangoS: [number | null, number | null];
  /** Frecuencia de Schroeder (M. R. Schroeder, 1954): fs = 2000·√(RT60/V),
   * el límite estándar de "sala grande" sobre el cual el campo sonoro es
   * suficientemente denso en modos para que un tiempo de reverberación
   * único (en vez de resonancias individuales) tenga sentido físico.
   * Calculada desde la banda de 500 Hz del escenario `amoblado` (no desde
   * el promedio final 500+2000, que infla la cifra con la banda de
   * agudos) — ver `modos.ts`, `techoModosDesdeSchroeder`, para cómo esta
   * frecuencia también fija el techo de la región de modos, cerrando el
   * hueco que quedaba entre las dos reglas. `null` cuando esa banda quedó
   * fuera de dominio (ver `rt60S`) — `techoModosDesdeSchroeder` cae a su
   * techo por defecto en ese caso. */
  frecuenciaSchroederHz: number | null;
  /** El RT60 estimado ya no emite veredicto — ver comentario de cabecera.
   * Siempre `'sin-datos'`: lo que falta es medir, no un umbral mal
   * elegido. `veredicto.ts` ya sabe excluir `'sin-datos'` de un grupo sin
   * arrastrarlo. */
  severidad: 'sin-datos';
  /** `'rt60-fuera-de-dominio'` cuando `rt60S` es `null` — declara que el
   * modelo no puede estimar nada acá, no sólo que no hay veredicto. */
  codigo: CodigoReverberacion;
}

function absorcionBandaSabines(materiales: Materiales, superficies: SuperficiesM2, bandaIdx: 0 | 1 | 2) {
  const frontal = ABSORCION_MURO_BANDAS[materiales.muroFrontal][bandaIdx] * superficies.frontal;
  const posterior = ABSORCION_MURO_BANDAS[materiales.muroPosterior][bandaIdx] * superficies.posterior;
  const izquierda = ABSORCION_MURO_BANDAS[materiales.muroIzquierdo][bandaIdx] * superficies.izquierda;
  const derecha = ABSORCION_MURO_BANDAS[materiales.muroDerecho][bandaIdx] * superficies.derecha;
  const piso = ABSORCION_PISO_BANDAS[materiales.piso][bandaIdx] * superficies.piso;
  const techo = ABSORCION_TECHO_BANDAS[materiales.techo][bandaIdx] * superficies.techo;
  return { frontal, posterior, izquierda, derecha, piso, techo, total: frontal + posterior + izquierda + derecha + piso + techo };
}

/** Límite del dominio de validez de Sabine/Eyring — ver "Límite de dominio"
 * en el comentario de cabecera del archivo. Ninguno de los dos modelos de
 * campo difuso describe ya una sala tan absorbente/abierta que la energía
 * se absorbe en uno o dos rebotes en vez de muchos. **Criterio del sitio**,
 * en el rango que informa la literatura de acústica arquitectónica para
 * la pérdida de validez de un campo difuso (~0,7-0,8), no una cifra única
 * publicada — mismo tipo de declaración que `UMBRAL_EYRING_ALPHA`, pero
 * sin una fuente tan puntual. */
export const ALPHA_CAMPO_DIFUSO_MAX = 0.8;

/** Sabine hasta `UMBRAL_EYRING_ALPHA`, Eyring entre ese umbral y
 * `ALPHA_CAMPO_DIFUSO_MAX`; por encima, ningún modelo aplica — ver
 * comentario de cabecera del archivo. */
function rt60DeBanda(
  volumenM3: number,
  superficieTotalM2: number,
  alphaBar: number
): { rt60S: number | null; metodo: 'sabine' | 'eyring' | 'fuera-de-dominio' } {
  if (alphaBar <= UMBRAL_EYRING_ALPHA) {
    return { rt60S: (0.161 * volumenM3) / (superficieTotalM2 * alphaBar), metodo: 'sabine' };
  }
  if (alphaBar <= ALPHA_CAMPO_DIFUSO_MAX) {
    return { rt60S: (0.161 * volumenM3) / (-superficieTotalM2 * Math.log(1 - alphaBar)), metodo: 'eyring' };
  }
  return { rt60S: null, metodo: 'fuera-de-dominio' };
}

interface SuperficiesM2 {
  frontal: number;
  posterior: number;
  izquierda: number;
  derecha: number;
  piso: number;
  techo: number;
}

/** Las 3 bandas de UN escenario de contenido — estructura + el término de
 * `CONTENIDO_SABINES_M2_PISO` correspondiente, sumado sobre la superficie
 * de piso (no una de las otras cinco: el contenido de una sala escala con
 * su superficie habitable, no con el área de sus paredes). */
function bandasDelEscenario(
  materiales: Materiales,
  superficies: SuperficiesM2,
  superficieTotalM2: number,
  volumenM3: number,
  escenario: EscenarioContenido
): BandaReverberacion[] {
  return BANDAS_HZ.map((hz, idx) => {
    const bandaIdx = idx as 0 | 1 | 2;
    const estructura = absorcionBandaSabines(materiales, superficies, bandaIdx).total;
    const contenido = CONTENIDO_SABINES_M2_PISO[escenario][bandaIdx] * superficies.piso;
    const alphaBar = (estructura + contenido) / superficieTotalM2;
    const { rt60S, metodo } = rt60DeBanda(volumenM3, superficieTotalM2, alphaBar);
    return { hz, alphaBar, rt60S, metodo };
  });
}

/** `null` si cualquiera de las dos bandas que promedian el RT60 final
 * (500/2000 Hz) quedó fuera de dominio — no se promedia con la banda que
 * sí dio número, eso fabricaría una cifra parcialmente inventada. */
function rt60Final(bandas: BandaReverberacion[]): number | null {
  const b500 = bandas[1]!.rt60S;
  const b2000 = bandas[2]!.rt60S;
  if (b500 === null || b2000 === null) return null;
  return (b500 + b2000) / 2;
}

export function evaluarReverberacion(sala: Sala, materiales: Materiales): ResultadoReverberacion {
  const { anchoM: W, largoM: L, altoM: H } = sala;
  const volumenM3 = W * L * H;

  const superficies: SuperficiesM2 = {
    frontal: W * H,
    posterior: W * H,
    izquierda: L * H,
    derecha: L * H,
    piso: W * L,
    techo: W * L,
  };
  const superficieTotalM2 =
    superficies.frontal + superficies.posterior + superficies.izquierda + superficies.derecha + superficies.piso + superficies.techo;

  const banda500Estructura = absorcionBandaSabines(materiales, superficies, 1);
  const absorcionContenidoSabines = CONTENIDO_SABINES_M2_PISO.amoblado[1] * superficies.piso;

  const bandas = bandasDelEscenario(materiales, superficies, superficieTotalM2, volumenM3, 'amoblado');
  const bandasVacio = bandasDelEscenario(materiales, superficies, superficieTotalM2, volumenM3, 'vacio');

  const rt60S = rt60Final(bandas); // extremo amoblado — el realista, o null fuera de dominio
  const rt60RangoS: [number | null, number | null] = [rt60S, rt60Final(bandasVacio)];

  // Banda de 500 Hz del escenario amoblado, no el promedio final (que
  // infla la cifra con la banda de agudos) — ver comentario de cabecera.
  // null si esa banda quedó fuera de dominio.
  const banda500Amoblado = bandas[1]!.rt60S;
  const frecuenciaSchroederHz = banda500Amoblado !== null ? 2000 * Math.sqrt(banda500Amoblado / volumenM3) : null;

  const codigo: CodigoReverberacion = rt60S === null ? 'rt60-fuera-de-dominio' : 'rt60-estimado';

  return {
    volumenM3,
    superficieFrontalM2: superficies.frontal,
    superficiePosteriorM2: superficies.posterior,
    superficieIzquierdaM2: superficies.izquierda,
    superficieDerechaM2: superficies.derecha,
    superficiePisoM2: superficies.piso,
    superficieTechoM2: superficies.techo,
    superficieTotalM2,
    absorcionFrontalSabines: banda500Estructura.frontal,
    absorcionPosteriorSabines: banda500Estructura.posterior,
    absorcionIzquierdaSabines: banda500Estructura.izquierda,
    absorcionDerechaSabines: banda500Estructura.derecha,
    absorcionPisoSabines: banda500Estructura.piso,
    absorcionTechoSabines: banda500Estructura.techo,
    absorcionTotalSabines: banda500Estructura.total,
    absorcionContenidoSabines,
    bandas,
    bandasVacio,
    rt60S,
    rt60RangoS,
    frecuenciaSchroederHz,
    severidad: 'sin-datos',
    codigo,
  };
}
