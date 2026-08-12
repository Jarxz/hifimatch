/**
 * El medidor de margen de potencia (escala + aguja + zona coloreada).
 * Widget de DOM, no lógica pura — construye los ticks una vez y después
 * sólo mueve/pinta lo que cambia en cada análisis.
 */
import { numConSigno } from '../formato/numeros.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';

const SMIN = -9;
const SMAX = 9;

function clamp(lo: number, v: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function pctDe(v: number): number {
  return ((clamp(SMIN, v, SMAX) - SMIN) / (SMAX - SMIN)) * 100;
}

/** Construye los ticks de la escala una sola vez (idempotente: limpia el
 * contenedor antes, así se puede llamar de nuevo sin duplicar nada). */
export function construirEscala(contenedor: HTMLElement): void {
  contenedor.innerHTML = '';

  const axis = document.createElement('div');
  axis.className = 'axis';
  contenedor.appendChild(axis);

  for (let v = SMIN; v <= SMAX; v++) {
    const t = document.createElement('div');
    t.className = 'tick';
    t.style.left = pctDe(v) + '%';
    if (v % 3 === 0) {
      t.className = 'tick major';
      const l = document.createElement('div');
      l.className = 'tl';
      l.textContent = (v > 0 ? '+' : '') + v;
      t.appendChild(l);
    }
    contenedor.appendChild(t);
  }

  const needle = document.createElement('div');
  needle.className = 'needle';
  needle.id = 'pw-needle';
  contenedor.appendChild(needle);

  const readout = document.createElement('div');
  readout.className = 'readout mono';
  readout.id = 'pw-read';
  contenedor.appendChild(readout);

  const zone = document.createElement('div');
  zone.id = 'pw-zone';
  zone.className = 'zone';
  contenedor.appendChild(zone);
}

/** Mueve la aguja, el readout y la zona coloreada al margen actual. */
export function actualizarMedidor(margenDb: number, idioma: Idioma): void {
  const pct = pctDe(margenDb);
  const needle = document.getElementById('pw-needle');
  const read = document.getElementById('pw-read');
  const zone = document.getElementById('pw-zone');
  if (!needle || !read || !zone) return;

  needle.style.left = pct + '%';
  read.textContent = numConSigno(margenDb, 1, idioma) + ' dB';
  read.style.left = pct + '%';

  if (margenDb >= 0) {
    zone.style.left = '50%';
    zone.style.width = pct - 50 + '%';
    zone.style.background = 'var(--ok)';
  } else {
    zone.style.left = pct + '%';
    zone.style.width = 50 - pct + '%';
    zone.style.background = 'var(--alert)';
  }
  read.style.color = margenDb >= 3 ? 'var(--ok)' : margenDb >= 0 ? 'var(--warn)' : 'var(--alert)';
}
