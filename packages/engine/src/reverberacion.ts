/**
 * Tiempo de reverberación estimado (RT60) — ecuación de Sabine, la fórmula
 * estándar de acústica arquitectónica (Wallace Clement Sabine, 1898):
 * RT60 = 0,161·V / A, donde V es el volumen de la sala en m³ y A es la
 * absorción total en sabines (m² de absorción equivalente), sumada
 * superficie por superficie: A = α_muro·S_muro + α_piso·S_piso +
 * α_techo·S_techo — no un coeficiente único para toda la sala.
 *
 * Mismo modelo simplificado que sala.ts/modos.ts en lo demás: sala rígida
 * y rectangular, un coeficiente de absorción por banda media (~500 Hz–1
 * kHz), no por banda de frecuencia — ver CLAUDE.md, "Severidad y bloque de
 * sala". Techo de severidad `warn`, nunca `error`.
 */
import type { Sala } from './sala.ts';

export type MaterialMuro = 'hormigon' | 'vidrio' | 'madera' | 'yesoCarton' | 'panelAcustico';
export type MaterialPiso = 'hormigon' | 'maderaLaminado' | 'porcelanato' | 'alfombra';
export type MaterialTecho = 'hormigon' | 'madera' | 'yesoCarton' | 'panelAcustico';

export interface Materiales {
  muro: MaterialMuro;
  piso: MaterialPiso;
  techo: MaterialTecho;
}

/**
 * Coeficientes de absorción de Sabine (banda media, ~500 Hz–1 kHz) por
 * material — criterio del sitio, valores típicos aproximados de literatura
 * de acústica arquitectónica para cada material (ej. hormigón/vidrio/
 * cerámica son muy reflectantes, α≈0,01–0,03; madera y placas sobre
 * bastidor absorben algo más por resonancia de panel, α≈0,06–0,12; panel
 * acústico dedicado y alfombra son los únicos con absorción alta,
 * α≈0,25–0,8). No son una medición de la sala real — se verifica midiendo
 * con un decibelímetro o una app de RT60.
 */
export const ABSORCION_MURO: Record<MaterialMuro, number> = {
  hormigon: 0.02,
  vidrio: 0.03,
  madera: 0.11,
  yesoCarton: 0.08,
  panelAcustico: 0.75,
};

export const ABSORCION_PISO: Record<MaterialPiso, number> = {
  hormigon: 0.02,
  maderaLaminado: 0.05,
  porcelanato: 0.01,
  alfombra: 0.28,
};

export const ABSORCION_TECHO: Record<MaterialTecho, number> = {
  hormigon: 0.02,
  madera: 0.11,
  yesoCarton: 0.06,
  panelAcustico: 0.75,
};

/** Rango objetivo de RT60 para escucha crítica en una sala doméstica
 * pequeña/mediana — criterio del sitio, no una sala de concierto (que
 * apunta a 1,5-2,5 s). Se verifica midiendo con un decibelímetro o una app
 * de RT60, no es una medición de la sala real. */
export const RT60_MIN_OK_S = 0.3;
export const RT60_MAX_OK_S = 0.6;

export type CodigoReverberacion = 'rt60-corto' | 'rt60-ok' | 'rt60-largo';

export interface ResultadoReverberacion {
  volumenM3: number;
  superficieMurosM2: number;
  superficiePisoM2: number;
  superficieTechoM2: number;
  absorcionMurosSabines: number;
  absorcionPisoSabines: number;
  absorcionTechoSabines: number;
  absorcionTotalSabines: number;
  rt60S: number;
  severidad: 'ok' | 'warn';
  codigo: CodigoReverberacion;
}

export function evaluarReverberacion(sala: Sala, materiales: Materiales): ResultadoReverberacion {
  const { anchoM: W, largoM: L, altoM: H } = sala;
  const volumenM3 = W * L * H;

  const superficieMurosM2 = 2 * (W * H) + 2 * (L * H);
  const superficiePisoM2 = W * L;
  const superficieTechoM2 = W * L;

  const absorcionMurosSabines = ABSORCION_MURO[materiales.muro] * superficieMurosM2;
  const absorcionPisoSabines = ABSORCION_PISO[materiales.piso] * superficiePisoM2;
  const absorcionTechoSabines = ABSORCION_TECHO[materiales.techo] * superficieTechoM2;
  const absorcionTotalSabines = absorcionMurosSabines + absorcionPisoSabines + absorcionTechoSabines;

  const rt60S = (0.161 * volumenM3) / absorcionTotalSabines;

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
    superficieMurosM2,
    superficiePisoM2,
    superficieTechoM2,
    absorcionMurosSabines,
    absorcionPisoSabines,
    absorcionTechoSabines,
    absorcionTotalSabines,
    rt60S,
    severidad,
    codigo,
  };
}
