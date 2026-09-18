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
 * sy=(x+y)·sin30−z.
 *
 * ── Qué vértice es el "eje" de las 3 caras visibles (bug real, corregido) ──
 * Dos versiones anteriores de este archivo eligieron mal ese vértice, cada
 * una de forma distinta, y las dos se vieron "abiertas" (caras que no
 * cierran en un volumen). Diagnóstico real, verificado con un cubo
 * perfecto y coloreando cada cara por separado: bajo esta proyección
 * ortográfica, la diagonal principal del cubo A=(0,0,0)↔C2=(w,d,h) queda
 * exactamente ALINEADA con la dirección de vista — para un cubo, A y C2
 * proyectan al MISMO punto de pantalla. Eso significa que las 3 caras que
 * hay que dibujar son las que tocan C2 (el vértice "cerca de cámara" en
 * este encuadre), nunca las que tocan A: TOP (z=h), la cara x=w y la cara
 * y=d. Elegir A2=(0,0,h) —el punto más ARRIBA en pantalla, que se probó
 * primero por parecer intuitivamente el "pico"— no es lo mismo que "cerca
 * de cámara": produce un cuadrilátero geométricamente válido para cada
 * cara por separado, pero el conjunto de 3 no cierra un volumen limpio
 * (la cara superior queda con una muesca cóncava hacia el centro). Se
 * comparó A2 vs. C2 lado a lado, con cada cara de un color, antes de
 * decidir — C2 da un cubo cerrado sin muescas ni cruces.
 *
 * Consecuencia: la cara con los detalles (drivers/perilla/pantalla) es la
 * de y=d (no y=0 como en las dos versiones anteriores) — por eso
 * `circuloFrontal`/`rectFrontal` reciben `yFrente` como parámetro en vez
 * de asumir 0.
 *
 * Wireframe honesto (fill:none salvo el LED chico de una fuente sin
 * pantalla, igual criterio que iconosCategoria.ts): ninguna cara se
 * "rellena" para fingir opacidad, sólo se atenúa con opacity para dar
 * sensación de profundidad.
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
 * y=`yFrente`, ejes locales x/z) — nunca una elipse dibujada a mano: bajo
 * esta proyección un círculo en esa cara SÍ sale una elipse (hay corte en
 * x), y calcularla punto a punto es el mismo criterio de "geometría real,
 * nunca aproximada a ojo" que ya rige el resto del sitio (ver
 * `vista/plano.ts`, `packages/engine/src/sala.ts`). */
function circuloFrontal(cx: number, cz: number, r: number, yFrente: number, pasos = 24): string {
  const puntos: Punto[] = [];
  for (let i = 0; i < pasos; i++) {
    const a = (i / pasos) * Math.PI * 2;
    puntos.push(proy(cx + r * Math.cos(a), yFrente, cz + r * Math.sin(a)));
  }
  return pathDe(puntos);
}

function rectFrontal(x0: number, z0: number, x1: number, z1: number, yFrente: number): string {
  return pathDe([proy(x0, yFrente, z0), proy(x1, yFrente, z0), proy(x1, yFrente, z1), proy(x0, yFrente, z1)]);
}

interface CajaIso {
  w: number;
  d: number;
  h: number;
}

/** Ancho/profundidad/alto en unidades abstractas (no metros) — sólo la
 * PROPORCIÓN importa. Calibrado contra fotos reales de referencia: un
 * Bowers & Wilkins 606 S2 (estantería, foto del usuario) mide 300×165×
 * 271 mm (alto×ancho×fondo) — mucho más angosto que profundo, no una caja
 * cuadrada en planta como tenía la primera versión; un Gold Note IS-10
 * (foto del usuario) es una fascia ancha y baja, más profunda que alta.
 * El parlante de columna sigue la misma idea (angosto, profundo) pero
 * más alargado en altura. */
function cajaDe(categoria: CategoriaEquipo, texto: string): CajaIso {
  if (categoria === 'parlante') {
    const columna = contieneAlguna(texto, ['columna', 'floorstander', 'piso']);
    return columna ? { w: 22, d: 35, h: 95 } : { w: 30, d: 49, h: 55 };
  }
  if (categoria === 'amplificador') return { w: 70, d: 46, h: 16 };
  return { w: 60, d: 40, h: 12 }; // streamer/dac
}

interface DetallesFrontales {
  trazo: string; // formas en línea, sin relleno — mismo criterio wireframe del resto
  relleno: string; // sólo el LED de una fuente sin pantalla, mismo criterio que iconosCategoria.ts
}

/** Detalles sobre la cara frontal (y=`caja.d`) — misma disciplina de
 * palabra clave que iconosCategoria.ts, recortada a lo que realmente
 * cambia la silueta en volumen: cantidad de vías (parlante), válvulas
 * visibles arriba (amplificador valvular) y pantalla (streamer/dac).
 *
 * Radios del parlante en función de `w` (ancho), no de `h`: el tamaño
 * real de un driver está limitado por el ancho del gabinete, no por su
 * alto — ver la foto de referencia del B&W 606 S2 (el woofer ocupa más
 * de la mitad del ancho del frente). Tweeter siempre arriba (z alto),
 * woofer(es) siempre abajo (z bajo) — mismo orden que un parlante real. */
function detallesDe(categoria: CategoriaEquipo, texto: string, caja: CajaIso): DetallesFrontales {
  const { w, h, d } = caja;
  const circ = (cx: number, cz: number, r: number): string => circuloFrontal(cx, cz, r, d);
  if (categoria === 'parlante') {
    const cx = w / 2;
    const vias = contarVias(texto);
    const tweeter = circ(cx, h * 0.85, w * 0.11);
    if (vias >= 3) {
      // tweeter arriba, medio al centro, woofer grande abajo.
      return { trazo: [tweeter, circ(cx, h * 0.53, w * 0.19), circ(cx, h * 0.21, w * 0.27)].join(' '), relleno: '' };
    }
    if (vias >= 2.5) {
      // tweeter arriba, dos woofers del mismo tamaño apilados debajo.
      return { trazo: [tweeter, circ(cx, h * 0.5, w * 0.24), circ(cx, h * 0.19, w * 0.24)].join(' '), relleno: '' };
    }
    // 2 vías — tweeter arriba, un woofer grande abajo (referencia real:
    // Bowers & Wilkins 606 S2, foto del usuario).
    return { trazo: [tweeter, circ(cx, h * 0.32, w * 0.32)].join(' '), relleno: '' };
  }
  if (categoria === 'amplificador') {
    // Pantalla a la izquierda + perilla a la derecha — referencia real:
    // Gold Note IS-10 (foto del usuario), mismo layout que ya usaba
    // iconosCategoria.ts (2D) para un integrado común, ahora en volumen.
    const pantalla = rectFrontal(w * 0.13, h * 0.22, w * 0.42, h * 0.85, d);
    const perilla = circ(w * 0.8, h * 0.5, h * 0.42);
    return { trazo: `${pantalla} ${perilla}`, relleno: '' };
  }
  // streamer/dac
  if (contieneAlguna(texto, ['pantalla', 'touchscreen', 'display a color'])) {
    return { trazo: rectFrontal(w * 0.08, h * 0.2, w * 0.55, h * 0.8, d), relleno: '' };
  }
  return { trazo: '', relleno: circ(w * 0.14, h * 0.5, h * 0.16) };
}

/** Válvulas asomando por la cara superior, cerca del borde frontal (y
 * grande, no el borde trasero oculto) — sólo cuando el texto las
 * declara. Se dibujan como 3 tubos verticales cortos, cada uno anclado a
 * un punto de la cara superior ya proyectada. */
function valvulasSuperiores(w: number, d: number, h: number): string {
  const alturaTubo = h * 0.5;
  const radioTubo = h * 0.09;
  const xs = [w * 0.28, w * 0.5, w * 0.72];
  const yBase = d * 0.68;
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
 * `circuloFrontal`: ese vive en una cara vertical, este en un plano
 * z=cte (horizontal), por eso ninguno de los dos reemplaza al otro. */
function circuloEnAltura(cx: number, cy: number, cz: number, r: number, pasos = 10): Punto[] {
  const puntos: Punto[] = [];
  for (let i = 0; i < pasos; i++) {
    const a = (i / pasos) * Math.PI * 2;
    puntos.push(proy(cx + r * Math.cos(a), cy + r * Math.sin(a), cz));
  }
  return puntos;
}

/** Perforaciones lineales en diagonal sobre la cara superior — rasgo
 * decorativo genérico de un amplificador (referencia real: Gold Note
 * IS-10, foto del usuario, disipador ranurado sobre la tapa), no una
 * afirmación puntual sobre el equipo real que se está dibujando — mismo
 * criterio que ya usa iconosCategoria.ts (2D) con las "patas" de un
 * amplificador: se dibujan siempre, sin depender de ninguna palabra
 * clave del catálogo. Cada línea cruza la mitad frontal de la cara
 * superior (la visible, cerca del borde y=d), con un corrimiento
 * diagonal parejo entre una y la siguiente. */
function perforacionesSuperiores(w: number, d: number, h: number): string {
  const n = 7;
  const xIni = w * 0.3;
  const xFin = w * 0.92;
  const corrimiento = w * 0.12;
  const lineas: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = xIni + t * (xFin - xIni);
    const p0 = proy(x, d * 0.55, h);
    const p1 = proy(x - corrimiento, d * 0.95, h);
    lineas.push(`M${fmt(p0[0])} ${fmt(p0[1])} L${fmt(p1[0])} ${fmt(p1[1])}`);
  }
  return lineas.join(' ');
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

  // Ver el comentario de cabecera: las 3 caras visibles tocan C2=(w,d,h),
  // nunca A=(0,0,0) — B/C (piso) y B2/C2/D2 (techo) son los vértices que
  // arman esas 3 caras. `A`/`Dc` (piso, lado x=0) no se usan: ese lado
  // queda oculto detrás del volumen.
  const B = proy(w, 0, 0);
  const C = proy(w, d, 0);
  const Dc = proy(0, d, 0);
  const A2 = proy(0, 0, h);
  const B2 = proy(w, 0, h);
  const C2 = proy(w, d, h);
  const D2 = proy(0, d, h);

  const caraLateral = pathDe([B, C, C2, B2]); // x=w — sin detalles, sólo atenuada
  const caraSuperior = pathDe([A2, B2, C2, D2]); // z=h
  const caraFrontal = pathDe([Dc, C, C2, D2]); // y=d — acá van drivers/perilla/pantalla
  const { trazo, relleno } = detallesDe(categoria, texto, { w, d, h });
  const esValvular = categoria === 'amplificador' && contieneAlguna(texto, ['válvula', 'valvula', 'tubo', 'set (', 'clase a pura']);
  const tubos = esValvular ? valvulasSuperiores(w, d, h) : '';
  const perforaciones = categoria === 'amplificador' ? perforacionesSuperiores(w, d, h) : '';

  const todos = [B, C, Dc, A2, B2, C2, D2];
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
    (perforaciones ? `<path d="${perforaciones}" opacity="0.5" stroke-width="1"></path>` : '') +
    (tubos ? `<path d="${tubos}" opacity="0.65" stroke-width="1.3"></path>` : '') +
    `<path d="${caraFrontal}"></path>` +
    (trazo ? `<path d="${trazo}" stroke-width="1.2"></path>` : '') +
    (relleno ? `<path d="${relleno}" fill="currentColor" stroke="none"></path>` : '') +
    `</svg>`
  );
}
