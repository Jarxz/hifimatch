/**
 * Handoff de datos entre `index.html` y `ar.html` — por query string, no
 * `sessionStorage`: más robusto ante una pestaña nueva, inspeccionable, y
 * testeable con `node --test` sin DOM. Puro.
 *
 * `muro*Vacio` son booleanos, no el `MaterialMuro` completo de
 * `reverberacion.ts` — `geometriaAr.ts` sólo distingue "vacío" (omite la
 * reflexión) de "no vacío" (la dibuja); qué material exacto es no cambia
 * ninguna geometría de AR (eso sólo importa para RT60, que no participa
 * acá). Codificar sólo el booleano relevante mantiene la URL corta.
 */
import type { Sala, Punto } from '../../../../packages/engine/src/sala.ts';

export interface EstadoAr {
  sala: Sala;
  parlanteIzq: Punto;
  parlanteDer: Punto;
  asiento: Punto;
  muroFrontalVacio: boolean;
  muroPosteriorVacio: boolean;
  muroIzquierdoVacio: boolean;
  muroDerechoVacio: boolean;
}

const DECIMALES = 3;

export function codificarEstadoAr(e: EstadoAr): string {
  const p = new URLSearchParams();
  p.set('W', e.sala.anchoM.toFixed(DECIMALES));
  p.set('L', e.sala.largoM.toFixed(DECIMALES));
  p.set('H', e.sala.altoM.toFixed(DECIMALES));
  p.set('six', e.parlanteIzq.x.toFixed(DECIMALES));
  p.set('siy', e.parlanteIzq.y.toFixed(DECIMALES));
  p.set('sdx', e.parlanteDer.x.toFixed(DECIMALES));
  p.set('sdy', e.parlanteDer.y.toFixed(DECIMALES));
  p.set('ax', e.asiento.x.toFixed(DECIMALES));
  p.set('ay', e.asiento.y.toFixed(DECIMALES));
  p.set('mf', e.muroFrontalVacio ? '1' : '0');
  p.set('mp', e.muroPosteriorVacio ? '1' : '0');
  p.set('mi', e.muroIzquierdoVacio ? '1' : '0');
  p.set('md', e.muroDerechoVacio ? '1' : '0');
  return p.toString();
}

/** Número finito, obligatorio — cualquier ausencia, `NaN`, o valor no
 * finito hace fallar toda la decodificación (ver `decodificarEstadoAr`). */
function numeroRequerido(p: URLSearchParams, clave: string): number | null {
  const v = p.get(clave);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Cota de sanidad generosa — no pretende reflejar el rango exacto de los
 * sliders de la UI (`index.html`, 2,5–7 × 3–9 × 2,2–3,5 al momento de
 * escribir esto): sólo rechaza un query string corrompido o manipulado a
 * mano, no debe romperse si esos rangos cambian más adelante. */
const DIMENSION_MAX_M = 50;

function esDimensionValida(n: number | null): n is number {
  return n !== null && n > 0 && n <= DIMENSION_MAX_M;
}

/**
 * Decodificación defensiva: el motor no confía ciegamente en coordenadas
 * externas (mismo criterio que ya declara `calcularDisposicionManual` en
 * sala.ts) — cualquier campo ausente, `NaN`, o fuera de rango devuelve
 * `null` en vez de tirar. El llamador (`entrada-ar.ts`) muestra un
 * fallback de "no se pudo leer los datos de la sala" en ese caso.
 */
export function decodificarEstadoAr(qs: string): EstadoAr | null {
  const p = new URLSearchParams(qs);
  const W = numeroRequerido(p, 'W');
  const L = numeroRequerido(p, 'L');
  const H = numeroRequerido(p, 'H');
  if (!esDimensionValida(W) || !esDimensionValida(L) || !esDimensionValida(H)) return null;

  const six = numeroRequerido(p, 'six');
  const siy = numeroRequerido(p, 'siy');
  const sdx = numeroRequerido(p, 'sdx');
  const sdy = numeroRequerido(p, 'sdy');
  const ax = numeroRequerido(p, 'ax');
  const ay = numeroRequerido(p, 'ay');
  if (six === null || siy === null || sdx === null || sdy === null || ax === null || ay === null) return null;

  return {
    sala: { anchoM: W, largoM: L, altoM: H },
    parlanteIzq: { x: six, y: siy },
    parlanteDer: { x: sdx, y: sdy },
    asiento: { x: ax, y: ay },
    muroFrontalVacio: p.get('mf') === '1',
    muroPosteriorVacio: p.get('mp') === '1',
    muroIzquierdoVacio: p.get('mi') === '1',
    muroDerechoVacio: p.get('md') === '1',
  };
}
