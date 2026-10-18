/**
 * Gráfico "Tu sala en frecuencia" de Resultado — puro: (modos del motor) →
 * string SVG, sin DOM (pintar.ts lo inyecta con innerHTML, mismo patrón que
 * plano.ts y curvamodal.ts).
 *
 * Qué muestra y qué NO (para no aparentar más física de la que hay): una
 * marca por cada uno de los primeros tres modos axiales de cada eje, en su
 * frecuencia teórica (f = n·343 / (2·L), la que ya calculó modos.ts para una
 * sala rectangular rígida). La altura de las marcas NO es amplitud — el
 * motor no la tiene y no la inventa. Las bandas doradas señalan pares de
 * modos de ejes distintos que `evaluarModos` ya marcó como agrupados
 * (frecuencias que coinciden): es el mismo dato del veredicto de "Modos de
 * sala", sólo dibujado; no hay un criterio nuevo acá.
 */
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import type { EjeSala, ModoAxial, ModoAgrupado } from '../../../../packages/engine/src/modos.ts';
import { coord, num } from '../formato/numeros.ts';
import { textosDe } from '../idioma/idioma.ts';

export const FRECUENCIA_MIN_HZ = 20;
export const FRECUENCIA_MAX_HZ = 200;
export const MODOS_POR_EJE = 3;

const ORDEN_EJES: EjeSala[] = ['ancho', 'largo', 'alto'];
// Colores por eje: neutros a propósito (ninguno es de severidad); el dorado
// de las bandas es el mismo tono que ya usa el sitio para "aviso".
const COLOR_EJE: Record<EjeSala, string> = { ancho: '#EFEDE7', largo: '#8FB8DE', alto: '#B8996A' };
const COLOR_BANDA = '#C7AD7C';
const COLOR_TEXTO = '#A9ADA6';
const COLOR_LINEA = 'rgba(239,237,231,.16)';

const ANCHO = 470;
const ALTO = 262;
const X0 = 35;
const X1 = 445;
const Y_EJE = 196;
const FILAS_Y0 = 45;
const FILA_PASO = 51;
const MARCA_ALTO = 30;

function xDe(frecuenciaHz: number): number {
  return X0 + ((frecuenciaHz - FRECUENCIA_MIN_HZ) / (FRECUENCIA_MAX_HZ - FRECUENCIA_MIN_HZ)) * (X1 - X0);
}

/** Los primeros `MODOS_POR_EJE` modos de cada eje dentro de [20, 200] Hz. */
export function modosParaGrafico(modos: readonly ModoAxial[]): ModoAxial[] {
  const elegidos: ModoAxial[] = [];
  for (const eje of ORDEN_EJES) {
    elegidos.push(
      ...modos
        .filter((m) => m.eje === eje && m.frecuenciaHz >= FRECUENCIA_MIN_HZ && m.frecuenciaHz <= FRECUENCIA_MAX_HZ)
        .sort((a, b) => a.orden - b.orden)
        .slice(0, MODOS_POR_EJE)
    );
  }
  return elegidos;
}

function mismoModo(a: ModoAxial, b: ModoAxial): boolean {
  return a.eje === b.eje && a.orden === b.orden;
}

/** Pares agrupados cuyos dos modos se dibujan — el resto queda en el texto de
 * la tarjeta "Modos de sala", no acá. */
export function paresDibujados(agrupados: readonly ModoAgrupado[], dibujados: readonly ModoAxial[]): ModoAgrupado[] {
  const esta = (m: ModoAxial): boolean => dibujados.some((d) => mismoModo(d, m));
  return agrupados.filter((p) => esta(p.modoA) && esta(p.modoB));
}

/** '' si ningún modo cae en el rango (no hay nada que dibujar). */
export function construirGraficoModosSvg(modos: readonly ModoAxial[], agrupados: readonly ModoAgrupado[], idioma: Idioma): string {
  const dibujados = modosParaGrafico(modos);
  if (dibujados.length === 0) return '';
  const t = textosDe(idioma);
  const nombreEje = t.motor.modos.eje;
  const pares = paresDibujados(agrupados, dibujados);

  let svg = '';
  // Rejilla vertical y escala en Hz
  for (const v of [20, 50, 100, 150, 200]) {
    const x = xDe(v);
    svg += `<line x1="${coord(x, 1)}" x2="${coord(x, 1)}" y1="17" y2="${Y_EJE}" stroke="${COLOR_LINEA}" stroke-width="1"/>`;
    svg += `<text x="${coord(x, 1)}" y="${Y_EJE + 22}" text-anchor="middle" fill="${COLOR_TEXTO}" font-size="10">${v}</text>`;
  }
  svg += `<line x1="${X0}" x2="${X1}" y1="${Y_EJE}" y2="${Y_EJE}" stroke="rgba(239,237,231,.4)" stroke-width="1"/>`;
  svg += `<text x="${X1}" y="${Y_EJE + 38}" text-anchor="end" fill="${COLOR_TEXTO}" font-size="10">Hz</text>`;

  // Bandas de coincidencia (detrás de las marcas)
  for (const p of pares) {
    const xa = xDe(Math.min(p.modoA.frecuenciaHz, p.modoB.frecuenciaHz));
    const xb = xDe(Math.max(p.modoA.frecuenciaHz, p.modoB.frecuenciaHz));
    const ancho = Math.max(xb - xa, 5);
    svg += `<rect x="${coord(xa - 2.5, 1)}" y="24" width="${coord(ancho + 5, 1)}" height="${Y_EJE - 24}" fill="${COLOR_BANDA}" fill-opacity=".16" stroke="${COLOR_BANDA}" stroke-opacity=".5" stroke-width="1"/>`;
  }

  // Marcas: una fila por eje
  for (const m of dibujados) {
    const fila = ORDEN_EJES.indexOf(m.eje);
    const x = xDe(m.frecuenciaHz);
    const y = FILAS_Y0 + fila * FILA_PASO;
    svg += `<line x1="${coord(x, 1)}" x2="${coord(x, 1)}" y1="${y}" y2="${y + MARCA_ALTO}" stroke="${COLOR_EJE[m.eje]}" stroke-width="2"/>`;
    svg += `<text x="${coord(x, 1)}" y="${y - 8}" text-anchor="middle" fill="${COLOR_EJE[m.eje]}" font-size="10">${num(m.frecuenciaHz, 0, idioma)}</text>`;
  }

  // Leyenda: un ítem por eje y, si hay pares, la banda
  const yLey = ALTO - 12;
  let xLey = X0;
  for (const eje of ORDEN_EJES) {
    svg += `<line x1="${xLey}" x2="${xLey + 14}" y1="${yLey - 3}" y2="${yLey - 3}" stroke="${COLOR_EJE[eje]}" stroke-width="2"/>`;
    svg += `<text x="${xLey + 20}" y="${yLey}" fill="${COLOR_TEXTO}" font-size="10">${nombreEje[eje]}</text>`;
    xLey += 20 + nombreEje[eje].length * 6.4 + 22;
  }
  if (pares.length > 0) {
    svg += `<rect x="${coord(xLey, 1)}" y="${yLey - 9}" width="14" height="10" fill="${COLOR_BANDA}" fill-opacity=".16" stroke="${COLOR_BANDA}" stroke-opacity=".5" stroke-width="1"/>`;
    svg += `<text x="${coord(xLey + 20, 1)}" y="${yLey}" fill="${COLOR_TEXTO}" font-size="10">${t.resultado.pcModosCoinciden}</text>`;
  }

  return `<svg viewBox="0 0 ${ANCHO} ${ALTO}" role="img" aria-label="${t.resultado.pcModosAria}" font-family="ui-monospace, 'SF Mono', Menlo, Consolas, monospace">${svg}</svg>`;
}
