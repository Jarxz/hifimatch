/** El `st` del prototipo, tipado. Estado mutable de la pantalla de configuración. */
import type { TipoSala } from '../../../packages/engine/src/reverberacion.ts';
import type { Genero } from '../../../packages/engine/src/genero.ts';

export type NivelUI = 'mod' | 'alto' | 'ref';

export interface Estado {
  spk: string | null; // id del ParlanteCat elegido
  amp: string | null; // id del AmplificadorCat elegido
  streamer: string | null; // id del FuenteCat (streamer) elegido, opcional
  dac: string | null; // id del FuenteCat (dac) elegido, opcional — independiente del streamer, pueden coexistir
  W: number; // ancho de sala, m
  L: number; // largo de sala, m
  H: number; // alto de sala, m
  lvl: NivelUI;
  tipoSala: TipoSala; // terminación de la sala, para el coeficiente de absorción de reverberacion.ts
  genero: Genero; // género musical, para el crest factor informativo de genero.ts
}

export const estado: Estado = {
  spk: null,
  amp: null,
  streamer: null,
  dac: null,
  W: 3.6,
  L: 5.0,
  H: 2.4,
  lvl: 'alto',
  tipoSala: 'balanceada',
  genero: 'rockpop',
};
