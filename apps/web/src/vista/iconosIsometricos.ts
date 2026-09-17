/**
 * Ícono isométrico por equipo — PURO, sin `document`. Pedido explícito
 * del usuario para "The Match Recomendado": una interpretación con
 * volumen (caja isométrica) en vez del ícono de frente plano que ya usa
 * Configurar (`iconosCategoria.ts`, sin cambios — sigue siendo el que se
 * ve al elegir un equipo). Mismas palabras clave y mismo criterio de
 * detección que ese archivo (`contarVias`/`contieneAlguna`, reexportadas
 * desde ahí) para no mantener dos listas separadas de la misma pregunta.
 *
 * Misma fórmula de proyección isométrica de 30° que ya usa
 * `vista/plano.ts` (el plano de reflexiones) y el fondo ambiente de la
 * portada (`main.ts`, `pintarFondoAmbiente`): sx=(x−y)·cos30,
 * sy=(x+y)·sin30−z. Reusar la misma fórmula no es casualidad — es el
 * mismo lenguaje visual del sitio (cubos de alambre isométricos) llevado
 * a una escala más chica, mismo criterio que ya se aplicó una vez para
 * el fondo de la portada.
 *
 * Wireframe honesto (fill:none salvo el LED chico de una fuente sin
 * pantalla, igual criterio que iconosCategoria.ts): ninguna cara se
 * "rellena" para fingir opacidad, sólo se atenúa con opacity para dar
 * sensación de profundidad — mismo principio que el plano de reflexiones
 * ("wireframe honesto, sin ocultamiento de superficies").
 */
import { contarVias, contieneAlguna } from './iconosCategoria.ts';
import type { CategoriaEquipo } from './iconosCategoria.ts';

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);

type Punto = readonly [number, number];

/** x = ancho (izquierda→derecha), y = profundidad (frente→fondo), z =
 * altura — mismos ejes que sala.ts, aplicados acá a una caja abstracta
 * en vez de una sala real. */
function proy(x: number, y: number, z: number): Punto {
  return [(x - y) * COS30, (x + y) * SIN30 - z];
}

function fmt(n: number): string {
  return String(Math.round(n * 10) / 10);
}

function pathDe(puntos: readonly Punto[]): string {
  const [p0, ...resto] = puntos;
  if (!p0) return '';
  return `M${fmt(p0[0])} ${fmt(p0[1])} ` + resto.map(([x, y]) => `L${fmt(x)} ${fmt(y)}`).join(' ') + ' Z';
}

/** Círculo real proyectado punto a punto sobre la cara frontal (plano
 * y=0, ejes locales x/z) — nunca una elipse dibujada a mano: bajo esta
 * proyección un círculo en esa cara SÍ sale una elipse (hay corte en x),
 * y calcularla punto a punto es el mismo criterio de "geometría real,
 * nunca aproximada a ojo" que ya rige el resto del sitio (ver
 * `vista/plano.ts`, `packages/engine/src/sala.ts`). */
function circuloFrontal(cx: number, cz: number, r: number, pasos = 24): string {
  const puntos: Punto[] = [];
  for (let i = 0; i < pasos; i++) {
    const a = (i / pasos) * Math.PI * 2;
    puntos.push(proy(cx + r * Math.cos(a), 0, cz + r * Math.sin(a)));
  }
  return pathDe(puntos);
}

function rectFrontal(x0: number, z0: number, x1: number, z1: number): string {
  return pathDe([proy(x0, 0, z0), proy(x1, 0, z0), proy(x1, 0, z1), proy(x0, 0, z1)]);
}

interface CajaIso {
  w: number;
  d: number;
  h: number;
}

/** Ancho/profundidad/alto en unidades abstractas (no metros) — sólo la
 * PROPORCIÓN importa, calibrada mirando las mismas fotos de referencia
 * que ya informaron iconosCategoria.ts (CLAUDE.md tiene el detalle): un
 * parlante de estantería es más alto que ancho/profundo, un
 * amplificador/streamer es una fascia baja y ancha. */
function cajaDe(categoria: CategoriaEquipo, texto: string): CajaIso {
  if (categoria === 'parlante') {
    const columna = contieneAlguna(texto, ['columna', 'floorstander', 'piso']);
    return columna ? { w: 26, d: 30, h: 78 } : { w: 34, d: 34, h: 52 };
  }
  if (categoria === 'amplificador') return { w: 62, d: 38, h: 22 };
  return { w: 58, d: 34, h: 12 }; // streamer/dac
}

interface DetallesFrontales {
  trazo: string; // formas en línea, sin relleno — mismo criterio wireframe del resto
  relleno: string; // sólo el LED de una fuente sin pantalla, mismo criterio que iconosCategoria.ts
}

/** Detalles sobre la cara frontal (y=0) — misma disciplina de palabra
 * clave que iconosCategoria.ts, recortada a lo que realmente cambia la
 * silueta en volumen: cantidad de vías (parlante), válvulas visibles
 * arriba (amplificador valvular) y pantalla (streamer/dac). */
function detallesDe(categoria: CategoriaEquipo, texto: string, caja: CajaIso): DetallesFrontales {
  const { w, h } = caja;
  if (categoria === 'parlante') {
    const cx = w / 2;
    const vias = contarVias(texto);
    if (vias >= 3) {
      return { trazo: [circuloFrontal(cx, h * 0.82, h * 0.1), circuloFrontal(cx, h * 0.5, h * 0.075), circuloFrontal(cx, h * 0.2, h * 0.045)].join(' '), relleno: '' };
    }
    if (vias >= 2.5) {
      return { trazo: [circuloFrontal(cx, h * 0.78, h * 0.11), circuloFrontal(cx, h * 0.46, h * 0.11), circuloFrontal(cx, h * 0.18, h * 0.045)].join(' '), relleno: '' };
    }
    // 2 vías — el caso más común del catálogo (ver iconosCategoria.ts).
    return { trazo: [circuloFrontal(cx, h * 0.62, h * 0.16), circuloFrontal(cx, h * 0.2, h * 0.055)].join(' '), relleno: '' };
  }
  if (categoria === 'amplificador') {
    return { trazo: circuloFrontal(w * 0.82, h * 0.5, h * 0.26), relleno: '' };
  }
  // streamer/dac
  if (contieneAlguna(texto, ['pantalla', 'touchscreen', 'display a color'])) {
    return { trazo: rectFrontal(w * 0.08, h * 0.2, w * 0.55, h * 0.8), relleno: '' };
  }
  return { trazo: '', relleno: circuloFrontal(w * 0.14, h * 0.5, h * 0.16) };
}

/** Válvulas asomando por la cara superior (y no la frontal: es donde
 * realmente están en un integrado a válvulas real) — sólo cuando el
 * texto las declara. Se dibujan como 3 tubos verticales cortos, cada uno
 * anclado a un punto de la cara superior ya proyectada. */
function valvulasSuperiores(w: number, d: number, h: number): string {
  const alturaTubo = h * 0.5;
  const radioTubo = h * 0.09;
  const xs = [w * 0.28, w * 0.5, w * 0.72];
  const yBase = d * 0.35;
  return xs
    .map((x) => {
      const base = proy(x, yBase, h);
      const tope = proy(x, yBase, h + alturaTubo);
      const gorro = pathDe(circuloEnAltura(x, yBase, h + alturaTubo, radioTubo));
      return `M${fmt(base[0])} ${fmt(base[1])} L${fmt(tope[0])} ${fmt(tope[1])} ${gorro}`;
    })
    .join(' ');
}

/** Círculo horizontal (paralelo al piso, a altura `cz`) proyectado punto a
 * punto — el "gorro" de vidrio en la punta de cada válvula. Distinto de
 * `circuloFrontal`: ese vive en la cara y=0 (vertical), este en un plano
 * z=cte (horizontal), por eso ninguno de los dos reemplaza al otro. */
function circuloEnAltura(cx: number, cy: number, cz: number, r: number, pasos = 10): Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i < pasos; i++) {
    const a = (i / pasos) * Math.PI * 2;
    puntos.push(proy(cx + r * Math.cos(a), cy + r * Math.sin(a), cz));
  }
  return puntos;
}

/**
 * `tipoEs`/`descripcionEs`: mismo texto curado del catálogo (campo `es`
 * de `Localizado`) que ya consume `iconoEquipoSvg` — nunca datos del
 * usuario, nunca el inglés (evita mantener dos listas de palabras
 * clave).
 */
export function iconoIsometricoSvg(categoria: CategoriaEquipo, tipoEs: string, descripcionEs: string): string {
  const texto = `${tipoEs} ${descripcionEs}`.toLowerCase();
  const { w, d, h } = cajaDe(categoria, texto);

  const A = proy(0, 0, 0);
  const B = proy(w, 0, 0);
  const C = proy(w, d, 0);
  const A2 = proy(0, 0, h);
  const B2 = proy(w, 0, h);
  const C2 = proy(w, d, h);
  const D2 = proy(0, d, h);

  const caraLateral = pathDe([B, C, C2, B2]);
  const caraSuperior = pathDe([A2, B2, C2, D2]);
  const caraFrontal = pathDe([A, B, B2, A2]);
  const { trazo, relleno } = detallesDe(categoria, texto, { w, d, h });
  const esValvular = categoria === 'amplificador' && contieneAlguna(texto, ['válvula', 'valvula', 'tubo', 'set (', 'clase a pura']);
  const tubos = esValvular ? valvulasSuperiores(w, d, h) : '';

  const todos = [A, B, C, A2, B2, C2, D2];
  const xs = todos.map((p) => p[0]);
  const ys = todos.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys) - (esValvular ? h * 0.5 : 0);
  const maxY = Math.max(...ys);
  const margen = Math.max(maxX - minX, maxY - minY) * 0.08;
  const vb = `${fmt(minX - margen)} ${fmt(minY - margen)} ${fmt(maxX - minX + margen * 2)} ${fmt(maxY - minY + margen * 2)}`;

  return (
    `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">` +
    `<path d="${caraLateral}" opacity="0.4"></path>` +
    `<path d="${caraSuperior}" opacity="0.65"></path>` +
    (tubos ? `<path d="${tubos}" opacity="0.65" stroke-width="1.3"></path>` : '') +
    `<path d="${caraFrontal}"></path>` +
    (trazo ? `<path d="${trazo}" stroke-width="1.2"></path>` : '') +
    (relleno ? `<path d="${relleno}" fill="currentColor" stroke="none"></path>` : '') +
    `</svg>`
  );
}
