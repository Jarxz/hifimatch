/** El `st` del prototipo, tipado. Estado mutable de la pantalla de configuración. */
import type { MaterialMuro, MaterialPiso, MaterialTecho } from '../../../packages/engine/src/reverberacion.ts';
import type { Genero } from '../../../packages/engine/src/genero.ts';
import type { Vista } from './vista/plano.ts';

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
  muroFrontal: MaterialMuro; // material del muro frontal (parlantes), para reverberacion.ts y el plano isométrico
  muroPosterior: MaterialMuro; // material del muro trasero (detrás de la escucha)
  muroIzquierdo: MaterialMuro; // material del muro lateral izquierdo
  muroDerecho: MaterialMuro; // material del muro lateral derecho
  piso: MaterialPiso; // material del piso, para reverberacion.ts
  techo: MaterialTecho; // material del cielo, para reverberacion.ts
  genero: Genero; // género musical, para el crest factor informativo de genero.ts
  vistaPlano: Vista; // ángulo de cámara del plano isométrico — sólo re-dibuja, no recalcula nada
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
  muroFrontal: 'yesoCarton',
  muroPosterior: 'yesoCarton',
  muroIzquierdo: 'yesoCarton',
  muroDerecho: 'yesoCarton',
  piso: 'maderaLaminado',
  techo: 'yesoCarton',
  genero: 'rockpop',
  vistaPlano: 'isometrica',
};
