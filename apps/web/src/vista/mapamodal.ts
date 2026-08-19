/**
 * Mapa de zonas modales — puro: (sala, disposición, agrupados) → string
 * SVG. Diagrama propio de la tarjeta "Modos de sala" (no del plano de
 * reflexiones): planta simple de la sala en 2D, con la grilla de celdas
 * coloreadas de fondo y los parlantes + punto dulce dibujados encima como
 * referencia espacial — no es una vista más del plano isométrico
 * (`plano.ts`), que sigue mostrando sólo reflexiones, sin mezclar las dos
 * capas de evidencia (modos vs. reflexiones) en un mismo dibujo.
 *
 * Qué es y qué NO es (misma disciplina que curvamodal.ts, que ya declara:
 * "no es un mapa de calor 2D/3D del campo combinado de la sala — eso exige
 * sumar fase y amplitud de cada modo, dato que este motor no tiene y no
 * inventa"). Esto tampoco lo hace. Es un **mapa de coincidencia
 * geométrica**: para cada modo de los agrupamientos ya curados
 * (`paresMasImportantes`, la misma curación que usan las curvas 1D), se
 * evalúa su propia condición de nodo/antinodo ya validada —
 * cos²(orden·π·x/longitud), la misma fórmula que curvamodal.ts ya
 * grafica en 1D — en un punto del plano en vez de a lo largo de un eje.
 * Combinar dos modos NO pretende ser "sumar presión real combinada" (eso
 * sí exigiría fase, y sigue prohibido) — es una regla de combinación
 * declarada, no una física nueva:
 *
 * - Dentro de un par (modoA + modoB): `Math.min(...)`, no promedio — el
 *   refuerzo exige que LOS DOS modos estén cerca de su antinodo a la vez;
 *   la cancelación es real si CUALQUIERA de los dos tiene un nodo ahí,
 *   sin importar el otro. El promedio borra esa asimetría física.
 * - Entre los hasta 2 pares curados: gana el valor más alejado de 0,5 (el
 *   hallazgo más extremo, no la mezcla) — promediar dos pares puede
 *   ocultar un problema real de uno detrás de que el otro esté bien en
 *   ese punto. Empate exacto: gana el valor más bajo (más "cancelación")
 *   — mismo sesgo que el resto del sitio, declarar un hueco antes que
 *   taparlo.
 *
 * Un modo del eje `alto` no varía en un plano horizontal — se evalúa en
 * `ALTURA_ESCUCHA_M` (mismo supuesto que las reflexiones de techo/piso),
 * dando un término CONSTANTE en todo el plano para ese modo. Si ese modo
 * cae cerca de su propio nodo a esa altura, el mapa de su par sale parejo
 * y bajo en TODA la sala — es información real (esa coincidencia no se
 * refuerza a la altura de escucha, en ningún punto del piso), no un bug;
 * la curva 1D de ese eje (curvamodal.ts) muestra la variación vertical
 * que este plano no puede.
 */
import type { Sala, Punto, DisposicionSala } from '../../../../packages/engine/src/sala.ts';
import { ALTURA_ESCUCHA_M } from '../../../../packages/engine/src/sala.ts';
import type { ModoAxial, ModoAgrupado } from '../../../../packages/engine/src/modos.ts';
import { paresMasImportantes } from '../../../../packages/engine/src/modos.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { coord } from '../formato/numeros.ts';
import { textosDe } from '../idioma/idioma.ts';
import { proyeccionSuperior } from './proyeccion.ts';

/** Columnas de la grilla — filas se derivan de la razón largo/ancho de la
 * sala, acotadas para no degenerar en salas muy alargadas. Resolución
 * justificada por el propio dominio: bajo TECHO_AGRUPAMIENTO_HZ (150 Hz)
 * el orden de un modo candidato ronda 7-9 como mucho en el eje más largo
 * típico, así que ya con una grilla moderada hay varias muestras por
 * semiperíodo — sin aliasing visible para un mapa de esta naturaleza. */
const COLUMNAS = 30;
const FILAS_MIN = 12;
const FILAS_MAX = 50;

/** Opacidad parcial: la grilla es una capa de fondo, el wireframe y las
 * etiquetas que se dibujan encima tienen que seguir leyéndose. */
const OPACIDAD_CELDA = 0.55;

/** Mismos 3 tonos que --alert/--warn/--ok en estilos.css, pero con nombre
 * propio (no las mismas variables): ese trío en el resto del sitio
 * codifica un orden monótono estricto (ok<warn<alert, verde siempre bien,
 * rojo siempre mal) — este gradiente es DIVERGENTE, lo "ideal" (amarillo)
 * está en el medio, no en un extremo. Reusar las variables tal cual
 * confundiría a quien las grepee después. */
const COLOR_CANCELACION: readonly [number, number, number] = [0xc5, 0x84, 0x74]; // mismo hex que --alert
const COLOR_EQUILIBRIO: readonly [number, number, number] = [0xc7, 0xad, 0x7c]; // mismo hex que --warn
const COLOR_REFUERZO: readonly [number, number, number] = [0x96, 0xb6, 0xa2]; // mismo hex que --ok

/** Intensidad relativa (0..1) de UN modo en un punto del plano — misma
 * fórmula cos² que curvamodal.ts ya grafica en 1D, evaluada en (x,y) en
 * vez de a lo largo de un solo eje. El eje `alto` no varía en un plano
 * horizontal: se evalúa en la altura de escucha fija, dando un valor
 * constante que no depende de `punto`. */
export function intensidadModoEn(modo: ModoAxial, sala: Sala, punto: Punto): number {
  if (modo.eje === 'ancho') return Math.cos((modo.orden * Math.PI * punto.x) / sala.anchoM) ** 2;
  if (modo.eje === 'largo') return Math.cos((modo.orden * Math.PI * punto.y) / sala.largoM) ** 2;
  return Math.cos((modo.orden * Math.PI * ALTURA_ESCUCHA_M) / sala.altoM) ** 2;
}

/** Combina los 2 modos de un mismo agrupamiento — "min", no promedio, ver
 * cabecera del archivo para la justificación física. */
export function intensidadParEn(par: ModoAgrupado, sala: Sala, punto: Punto): number {
  return Math.min(intensidadModoEn(par.modoA, sala, punto), intensidadModoEn(par.modoB, sala, punto));
}

/** Combina hasta `TOP_N_AGRUPADOS` pares — gana el valor más alejado de
 * 0,5 (el hallazgo más extremo). Con `pares` vacío devuelve 0,5
 * (equilibrio) por definición — en la práctica `construirMapaModalSvg` ya
 * filtra ese caso antes de llegar acá, pero la función queda bien
 * definida para uso/test directo. */
export function intensidadCombinadaEn(punto: Punto, sala: Sala, pares: readonly ModoAgrupado[]): number {
  let elegido = 0.5;
  for (const par of pares) {
    const v = intensidadParEn(par, sala, punto);
    const distV = Math.abs(v - 0.5);
    const distElegido = Math.abs(elegido - 0.5);
    if (distV > distElegido || (distV === distElegido && v < elegido)) elegido = v;
  }
  return elegido;
}

function interpolarLineal(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function aHex(rgb: readonly [number, number, number]): string {
  return (
    '#' +
    rgb
      .map((v) =>
        Math.round(Math.max(0, Math.min(255, v)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

/** Interpola los 3 tonos del gradiente divergente: 0→cancelación,
 * 0,5→equilibrio, 1→refuerzo. */
export function colorDeIntensidad(intensidad: number): string {
  const t = Math.max(0, Math.min(1, intensidad));
  const [c1, c2, tLocal] = t <= 0.5 ? [COLOR_CANCELACION, COLOR_EQUILIBRIO, t / 0.5] : [COLOR_EQUILIBRIO, COLOR_REFUERZO, (t - 0.5) / 0.5];
  return aHex([interpolarLineal(c1[0], c2[0], tLocal), interpolarLineal(c1[1], c2[1], tLocal), interpolarLineal(c1[2], c2[2], tLocal)]);
}

/** '' si no hay agrupamientos curados — no hay nada que marcar. Sólo tiene
 * sentido geométrico en la vista Superior (el llamador, plano.ts, es
 * responsable de no insertarlo en otra vista). */
export function construirMapaModalSvg(sala: Sala, agrupados: readonly ModoAgrupado[]): string {
  const pares = paresMasImportantes([...agrupados]);
  if (pares.length === 0) return '';

  const { pad, scale } = proyeccionSuperior(sala);
  const filas = Math.max(FILAS_MIN, Math.min(FILAS_MAX, Math.round(COLUMNAS * (sala.largoM / sala.anchoM))));
  const anchoCeldaM = sala.anchoM / COLUMNAS;
  const largoCeldaM = sala.largoM / filas;
  const wPx = anchoCeldaM * scale;
  const hPx = largoCeldaM * scale;

  let svg = '';
  for (let fila = 0; fila < filas; fila++) {
    for (let col = 0; col < COLUMNAS; col++) {
      const centroM: Punto = { x: (col + 0.5) * anchoCeldaM, y: (fila + 0.5) * largoCeldaM };
      const color = colorDeIntensidad(intensidadCombinadaEn(centroM, sala, pares));
      const x = pad + col * wPx;
      const y = pad + fila * hPx;
      svg += `<rect x="${coord(x, 1)}" y="${coord(y, 1)}" width="${coord(wPx, 1)}" height="${coord(hPx, 1)}" fill="${color}" fill-opacity="${OPACIDAD_CELDA}" stroke="none"/>`;
    }
  }
  return svg;
}

/** '' si no hay agrupamientos curados (`construirMapaModalSvg` ya resuelve
 * ese caso) — no hay nada que mostrar. Planta simple en 2D (no isométrica:
 * esta tarjeta no tiene selector de vista) con la grilla de fondo,
 * contorno de sala, parlantes y punto dulce — mismas posiciones que ya
 * calculó `sala.ts` para el plano de reflexiones, dibujadas de nuevo acá
 * porque este es un diagrama propio de "Modos", no una vista del plano
 * isométrico (`plano.ts` no dibuja este mapa). */
export function construirDiagramaModalSvg(sala: Sala, disp: DisposicionSala, agrupados: readonly ModoAgrupado[], idioma: Idioma): string {
  const pares = paresMasImportantes([...agrupados]);
  if (pares.length === 0) return '';

  const t = textosDe(idioma).resultado.plano;
  const { pad, scale } = proyeccionSuperior(sala);
  const sw = sala.anchoM * scale + pad * 2;
  const sh = sala.largoM * scale + pad * 2;
  const px = (x: number): number => pad + x * scale;
  const py = (y: number): number => pad + y * scale;

  let s = `<svg viewBox="0 0 ${coord(sw, 0)} ${coord(sh, 0)}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace,Menlo,Consolas,monospace">`;
  s += construirMapaModalSvg(sala, agrupados);
  s += `<rect x="${coord(pad, 1)}" y="${coord(pad, 1)}" width="${coord(sala.anchoM * scale, 1)}" height="${coord(sala.largoM * scale, 1)}" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1.2"/>`;

  const PARLANTE = 'fill="#ECECEE"';
  const ETIQUETA = 'fill="#ECECEE" font-size="9.5" text-anchor="middle"';
  const parlante = (p: Punto, etiqueta: string): string => {
    const cx = coord(px(p.x), 1);
    const cy = coord(py(p.y), 1);
    return `<circle cx="${cx}" cy="${cy}" r="5" ${PARLANTE}/><text x="${cx}" y="${coord(py(p.y) - 10, 1)}" ${ETIQUETA}>${etiqueta}</text>`;
  };
  s += parlante(disp.parlanteIzq, 'L');
  s += parlante(disp.parlanteDer, 'R');

  const dcx = coord(px(disp.puntoDulce.x), 1);
  const dcy = coord(py(disp.puntoDulce.y), 1);
  s += `<circle cx="${dcx}" cy="${dcy}" r="4" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1" stroke-dasharray="3 3"/>`;
  s += `<circle cx="${dcx}" cy="${dcy}" r="3.5" fill="#ECECEE"/>`;
  s += `<text x="${dcx}" y="${coord(py(disp.puntoDulce.y) + 16, 1)}" fill="#ECECEE" font-size="10" text-anchor="middle">${t.puntoDulce}</text>`;

  s += '</svg>';
  return s;
}
