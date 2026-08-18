/**
 * Proyección de la vista Superior del plano — extraída de plano.ts a un
 * módulo propio para que un tercer consumidor (mapamodal.ts, el mapa de
 * zonas modales) pueda importarla sin crear un ciclo (plano.ts ya importa
 * mapamodal.ts para insertar su capa). `plano.ts` re-exporta
 * `proyeccionSuperior` para que `arrastre.ts`/`plano.test.ts` sigan
 * importándola desde ahí sin cambios.
 */
import type { Sala } from '../../../../packages/engine/src/sala.ts';

export const PAD_SVG = 64;
export const MAX_ANCHO_PROYECCION = 560;
export const MAX_ALTO_PROYECCION = 460;

/**
 * pad/scale que usa la vista Superior (`sx=x, sy=y`, sin trigonometría) —
 * expuesto para que la capa de arrastre (`vista/arrastre.ts`) y el mapa de
 * zonas modales (`vista/mapamodal.ts`) puedan invertir/derivar coordenadas
 * de pantalla a metros de sala sin duplicar esta cuenta. `construirPlanoSvg`
 * llama a esta misma función para esa vista, así que dibujo, arrastre y
 * mapa de zonas nunca pueden desincronizarse.
 */
export function proyeccionSuperior(sala: Sala): { pad: number; scale: number } {
  const anchoSpan = Math.max(sala.anchoM, 0.5);
  const altoSpan = Math.max(sala.largoM, 0.5);
  const scale = Math.min(MAX_ANCHO_PROYECCION / anchoSpan, MAX_ALTO_PROYECCION / altoSpan);
  return { pad: PAD_SVG, scale };
}
