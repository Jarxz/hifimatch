/**
 * Tiempo de reverberación estimado (RT60) — ecuación de Sabine, la fórmula
 * estándar de acústica arquitectónica (Wallace Clement Sabine, 1898):
 * RT60 = 0,161·V / A, donde V es el volumen de la sala en m³ y A es la
 * absorción total en sabines (m² de absorción equivalente).
 *
 * Mismo modelo simplificado que sala.ts/modos.ts: sala rígida y
 * rectangular, un solo coeficiente de absorción promedio por sala (no por
 * superficie ni por banda de frecuencia) — ver CLAUDE.md, "Severidad y
 * bloque de sala". Techo de severidad `warn`, nunca `error`.
 */
import type { Sala } from './sala.ts';

export type TipoSala = 'moderna' | 'balanceada' | 'tratada';

/**
 * Coeficiente de absorción promedio (banda media, ~500 Hz–1 kHz) por
 * categoría de sala — criterio del sitio, valores típicos aproximados de
 * literatura de acústica arquitectónica para estos tipos de terminación,
 * no una medición de la sala real. "moderna" = piso duro (porcelanato/
 * madera), pocos muebles; "balanceada" = alfombra + cortinas + muebles
 * tapizados; "tratada" = paneles/absorción acústica dedicada.
 */
export const COEFICIENTE_ABSORCION: Record<TipoSala, number> = {
  moderna: 0.08,
  balanceada: 0.2,
  tratada: 0.35,
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
  superficieTotalM2: number;
  absorcionSabines: number;
  rt60S: number;
  severidad: 'ok' | 'warn';
  codigo: CodigoReverberacion;
}

export function evaluarReverberacion(sala: Sala, tipoSala: TipoSala): ResultadoReverberacion {
  const { anchoM: W, largoM: L, altoM: H } = sala;
  const volumenM3 = W * L * H;
  const superficieTotalM2 = 2 * (W * L) + 2 * (W * H) + 2 * (L * H);
  const absorcionSabines = COEFICIENTE_ABSORCION[tipoSala] * superficieTotalM2;
  const rt60S = (0.161 * volumenM3) / absorcionSabines;

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

  return { volumenM3, superficieTotalM2, absorcionSabines, rt60S, severidad, codigo };
}
