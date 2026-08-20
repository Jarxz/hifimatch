/**
 * Tiempo de reverberación estimado (RT60) — modelo multibanda (125/500/2000
 * Hz, terceras de octava representativas de graves/medios/agudos) en vez de
 * un único coeficiente de banda media. Cada banda suma su propia absorción
 * superficie por superficie (igual que antes: A_banda = Σ α_banda,i · S_i,
 * nunca un coeficiente único para toda la sala ni para un "muro" genérico —
 * cada muro se orienta y se declara aparte) y elige su propia fórmula:
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
 * El RT60 final que se muestra es el promedio de las bandas 500 Hz y 2000
 * Hz — una simplificación de este sitio (no el "T_mid" de 500+1000 Hz de
 * ISO 3382, que exigiría una cuarta banda que este modelo no tiene) para
 * quedarse con un solo número fácil de leer sin perder la banda de graves
 * (125 Hz) del todo: esa banda sigue expuesta en `bandas[]` para quien
 * quiera el detalle completo.
 *
 * Mismo modelo simplificado que sala.ts/modos.ts en lo demás: sala rígida
 * y rectangular — ver CLAUDE.md, "Severidad y bloque de sala". Techo de
 * severidad `warn`, nunca `error`.
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
 * sitio (a diferencia de otros umbrales de este motor, como el 5%/150 Hz de
 * modos.ts, que sí son criterio propio declarado como tal). */
export const UMBRAL_EYRING_ALPHA = 0.2;

/** Rango objetivo de RT60 para escucha crítica en una sala doméstica
 * pequeña/mediana — criterio del sitio, no una sala de concierto (que
 * apunta a 1,5-2,5 s). Se verifica midiendo con un decibelímetro o una app
 * de RT60, no es una medición de la sala real. */
export const RT60_MIN_OK_S = 0.3;
export const RT60_MAX_OK_S = 0.6;

export type CodigoReverberacion = 'rt60-corto' | 'rt60-ok' | 'rt60-largo';

export interface BandaReverberacion {
  hz: BandaHz;
  alphaBar: number;
  rt60S: number;
  metodo: 'sabine' | 'eyring';
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
  /** Desglose superficie×superficie a 500 Hz — banda de referencia para el
   * detalle "calc" de la tarjeta (una de las dos que promedian el RT60
   * final). El panorama de las 3 bandas completas vive en `bandas[]`. */
  absorcionFrontalSabines: number;
  absorcionPosteriorSabines: number;
  absorcionIzquierdaSabines: number;
  absorcionDerechaSabines: number;
  absorcionPisoSabines: number;
  absorcionTechoSabines: number;
  absorcionTotalSabines: number;
  bandas: BandaReverberacion[]; // una por cada BANDAS_HZ, en orden
  /** RT60 final mostrado — promedio de las bandas 500 Hz y 2000 Hz. */
  rt60S: number;
  /** Frecuencia de Schroeder (M. R. Schroeder, 1954): fs = 2000·√(RT60/V),
   * el límite estándar de "sala grande" sobre el cual el campo sonoro es
   * suficientemente denso en modos para que un tiempo de reverberación
   * único (en vez de resonancias individuales) tenga sentido físico. */
  frecuenciaSchroederHz: number;
  severidad: 'ok' | 'warn';
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

/** Sabine hasta `UMBRAL_EYRING_ALPHA`, Eyring por encima — ver comentario de
 * cabecera del archivo. */
function rt60DeBanda(volumenM3: number, superficieTotalM2: number, alphaBar: number): { rt60S: number; metodo: 'sabine' | 'eyring' } {
  if (alphaBar <= UMBRAL_EYRING_ALPHA) {
    return { rt60S: (0.161 * volumenM3) / (superficieTotalM2 * alphaBar), metodo: 'sabine' };
  }
  return { rt60S: (0.161 * volumenM3) / (-superficieTotalM2 * Math.log(1 - alphaBar)), metodo: 'eyring' };
}

interface SuperficiesM2 {
  frontal: number;
  posterior: number;
  izquierda: number;
  derecha: number;
  piso: number;
  techo: number;
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

  const bandas: BandaReverberacion[] = BANDAS_HZ.map((hz, idx) => {
    const banda = absorcionBandaSabines(materiales, superficies, idx as 0 | 1 | 2);
    const alphaBar = banda.total / superficieTotalM2;
    const { rt60S, metodo } = rt60DeBanda(volumenM3, superficieTotalM2, alphaBar);
    return { hz, alphaBar, rt60S, metodo };
  });

  const banda500 = absorcionBandaSabines(materiales, superficies, 1);

  const rt60_500 = bandas[1]!.rt60S;
  const rt60_2000 = bandas[2]!.rt60S;
  const rt60S = (rt60_500 + rt60_2000) / 2;

  const frecuenciaSchroederHz = 2000 * Math.sqrt(rt60S / volumenM3);

  let severidad: ResultadoReverberacion['severidad'];
  let codigo: CodigoReverberacion;
  if (rt60S < RT60_MIN_OK_S) {
    severidad = 'warn';
    codigo = 'rt60-corto';
  } else if (rt60S > RT60_MAX_OK_S) {
    severidad = 'warn';
    codigo = 'rt60-largo';
  } else {
    severidad = 'ok';
    codigo = 'rt60-ok';
  }

  return {
    volumenM3,
    superficieFrontalM2: superficies.frontal,
    superficiePosteriorM2: superficies.posterior,
    superficieIzquierdaM2: superficies.izquierda,
    superficieDerechaM2: superficies.derecha,
    superficiePisoM2: superficies.piso,
    superficieTechoM2: superficies.techo,
    superficieTotalM2,
    absorcionFrontalSabines: banda500.frontal,
    absorcionPosteriorSabines: banda500.posterior,
    absorcionIzquierdaSabines: banda500.izquierda,
    absorcionDerechaSabines: banda500.derecha,
    absorcionPisoSabines: banda500.piso,
    absorcionTechoSabines: banda500.techo,
    absorcionTotalSabines: banda500.total,
    bandas,
    rt60S,
    frecuenciaSchroederHz,
    severidad,
    codigo,
  };
}
