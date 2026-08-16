/**
 * Curvas de presión modal — puro: (sala, modos agrupados) → string SVG.
 * Ningún acceso al DOM acá; pintar.ts lo inyecta con innerHTML, igual
 * patrón que plano.ts.
 *
 * Qué muestra y qué NO muestra (para no aparentar más física de la que
 * hay): un modo axial de orden n en una dimensión rígida de longitud L
 * tiene una forma cerrada conocida, presión ∝ cos(n·π·x/L) — acá se
 * grafica la intensidad relativa cos²(n·π·x/L) (0 a 1) a lo largo de ESE
 * eje solamente. No es un mapa de calor 2D/3D del campo combinado de la
 * sala (eso exige sumar fase y amplitud de cada modo, dato que este motor
 * no tiene y no inventa) — son curvas 1D, una por eje afectado, mostradas
 * por separado. Mismo supuesto y misma salvedad que sala.ts/modos.ts.
 */
import type { Sala } from '../../../../packages/engine/src/sala.ts';
import type { EjeSala, ModoAgrupado } from '../../../../packages/engine/src/modos.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { coord, num } from '../formato/numeros.ts';
import { textosDe } from '../idioma/idioma.ts';

const ORDEN_EJES: EjeSala[] = ['ancho', 'largo', 'alto'];
const COLORES = ['#C7AD7C', '#8FB8DE', '#D98080', '#9BD98A'];

/** Cuántos agrupamientos graficar — los de menor frecuencia, que son los
 * más audibles y los más difíciles de tratar acústicamente. El resto de
 * los agrupamientos sigue contando en el texto de la tarjeta (el "N
 * par(es)..."), sólo no se grafican, para no saturar de curvas. */
export const TOP_N_AGRUPADOS = 2;

const ANCHO_CHART = 380;
const ALTO_CHART = 64;
const PAD = 8;
const PAD_SUP = 18; // deja lugar al <text> del eje arriba del recuadro

function curvaPoints(longitudM: number, orden: number): string {
  const N = 60;
  const puntos: string[] = [];
  for (let i = 0; i <= N; i++) {
    const xM = (i / N) * longitudM;
    const xPx = PAD + (i / N) * ANCHO_CHART;
    const intensidadRel = Math.cos((orden * Math.PI * xM) / longitudM) ** 2; // 0..1
    const yPx = PAD_SUP + ALTO_CHART - intensidadRel * ALTO_CHART;
    puntos.push(`${coord(xPx, 1)},${coord(yPx, 1)}`);
  }
  return puntos.join(' ');
}

/** '' si no hay modos agrupados — no hay nada que explicar visualmente. */
export function construirCurvasModalesSvg(sala: Sala, agrupados: ModoAgrupado[], idioma: Idioma): string {
  if (agrupados.length === 0) return '';

  const t = textosDe(idioma).motor.modos;
  const longitudPorEje: Record<EjeSala, number> = { ancho: sala.anchoM, largo: sala.largoM, alto: sala.altoM };

  const masImportantes = [...agrupados]
    .sort((a, b) => (a.modoA.frecuenciaHz + a.modoB.frecuenciaHz) / 2 - (b.modoA.frecuenciaHz + b.modoB.frecuenciaHz) / 2)
    .slice(0, TOP_N_AGRUPADOS);

  const modosPorEje = new Map<EjeSala, Map<number, number>>(); // eje -> (orden -> frecuenciaHz)
  for (const a of masImportantes) {
    for (const modo of [a.modoA, a.modoB]) {
      if (!modosPorEje.has(modo.eje)) modosPorEje.set(modo.eje, new Map());
      modosPorEje.get(modo.eje)!.set(modo.orden, modo.frecuenciaHz);
    }
  }

  const ejes = ORDEN_EJES.filter((e) => modosPorEje.has(e));
  const sw = ANCHO_CHART + PAD * 2;
  const sh = PAD_SUP + ALTO_CHART + PAD;

  let salida = '';
  for (const eje of ejes) {
    const ordenes = [...modosPorEje.get(eje)!.entries()].sort((a, b) => a[0] - b[0]);
    const longitudM = longitudPorEje[eje];

    let chart = `<svg viewBox="0 0 ${coord(sw, 0)} ${coord(sh, 0)}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace,Menlo,Consolas,monospace">`;
    chart += `<text x="${coord(PAD, 0)}" y="11" fill="#8C8C93" font-size="10">${t.eje[eje]}</text>`;
    chart += `<rect x="${coord(PAD, 0)}" y="${coord(PAD_SUP, 0)}" width="${coord(ANCHO_CHART, 0)}" height="${coord(ALTO_CHART, 0)}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="1"/>`;

    let leyenda = '';
    ordenes.forEach(([orden, frecuenciaHz], i) => {
      const color = COLORES[i % COLORES.length]!;
      chart += `<polyline points="${curvaPoints(longitudM, orden)}" fill="none" stroke="${color}" stroke-width="1.3"/>`;
      leyenda += `<span style="color:${color}">■</span> ${t.curvaOrden({ orden: String(orden), frecuencia: num(frecuenciaHz, 1, idioma) })} `;
    });

    chart += '</svg>';
    salida += `<div class="curva-modal">${chart}<div class="curva-leyenda">${leyenda.trim()}</div></div>`;
  }
  return salida;
}
