/**
 * Vista isométrica de la sala — puro: (sala, disposición, muros, vista) →
 * string. Reemplaza el plano 2D top-down: un cubo de alambre a escala, con
 * el triángulo de escucha y las 8 reflexiones que calcula sala.ts
 * (laterales, trasera, techo, piso) cada una con su distancia total del
 * camino parlante→superficie→escucha. Un muro declarado "vacío" no dibuja
 * su reflexión — el sonido se escapa, no vuelve.
 *
 * `vista` cambia sólo la proyección (isométrica/frontal/lateral/superior)
 * — mismos datos, mismo dibujo, otro ángulo de cámara fijo. Se eligió este
 * enfoque de botones de vista preestablecida en vez de arrastre libre con
 * mouse: no agrega el primer widget interactivo-con-mouse del sitio, y
 * sigue siendo una función pura (sin estado, sin listeners) — el botón que
 * la dispara vive en pintar.ts/main.ts, no acá.
 *
 * Deliberadamente un wireframe (sin ocultamiento de superficies): intentar
 * "resolver" qué caras tapan a qué en una proyección dibujada a mano
 * introduciría errores de renderizado que un motor de gráficos 3D real
 * evita con z-buffer; un cubo de alambre transparente es honesto sobre lo
 * que este modelo puede garantizar (geometría exacta) sin fingir opacidad
 * que no está calculada. En las vistas ortográficas (frontal/lateral/
 * superior) algunos elementos caen exactamente superpuestos — es una
 * propiedad esperada de una proyección ortográfica real (una elevación
 * arquitectónica tampoco muestra profundidad), no un error de cálculo.
 *
 * Misma trampa que el plano 2D anterior: coordenadas SVG con `coord()`
 * (punto ASCII, nunca localizado); sólo los `<text>` de metros/distancia
 * usan `num()`.
 */
import type { Sala, DisposicionSala } from '../../../../packages/engine/src/sala.ts';
import type { MaterialMuro } from '../../../../packages/engine/src/reverberacion.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { coord, num } from '../formato/numeros.ts';
import { textosDe } from '../idioma/idioma.ts';

export type Vista = 'isometrica' | 'frontal' | 'lateral' | 'superior';

export interface MurosVista {
  frontal: MaterialMuro;
  posterior: MaterialMuro;
  izquierdo: MaterialMuro;
  derecho: MaterialMuro;
}

interface Pt3 {
  x: number;
  y: number;
  z: number;
}

const COS30 = Math.sqrt(3) / 2;
const SIN30 = 0.5;

/**
 * Dimensiones de la caja que representa cada parlante en el dibujo —
 * ilustrativas, no físicas: el catálogo no tiene el tamaño físico por
 * equipo, así que esto no alimenta ningún cálculo, sólo hace que el ícono
 * se lea como un volumen en vez de un punto. Tamaño típico de un parlante
 * de estantería mediano. Centrada en el eje acústico asumido (altura de
 * escucha), no modela specíficamente de piso ni de pie/estante.
 */
const ANCHO_PARLANTE_M = 0.2;
const PROFUNDIDAD_PARLANTE_M = 0.25;
const ALTO_PARLANTE_M = 0.34;

/** Proyecta según la vista elegida — misma geometría 3D, distinto ángulo
 * de cámara fijo. Isométrica: 30°, x/y/z todos visibles. Frontal/lateral:
 * ortográficas, dejan caer un eje horizontal. Superior: ortográfica dejando
 * caer la altura (similar al plano 2D top-down que reemplaza esta vista). */
function proyectar(p: Pt3, vista: Vista): { sx: number; sy: number } {
  switch (vista) {
    case 'frontal':
      return { sx: p.x, sy: -p.z };
    case 'lateral':
      return { sx: p.y, sy: -p.z };
    case 'superior':
      return { sx: p.x, sy: p.y };
    case 'isometrica':
    default:
      return { sx: (p.x - p.y) * COS30, sy: (p.x + p.y) * SIN30 - p.z };
  }
}

export function construirPlanoSvg(sala: Sala, disp: DisposicionSala, muros: MurosVista, vista: Vista, idioma: Idioma): string {
  const t = textosDe(idioma).resultado.plano;
  const { anchoM: W, largoM: L, altoM: H } = sala;
  const h = disp.alturaM;

  const corners: Pt3[] = [
    { x: 0, y: 0, z: 0 },
    { x: W, y: 0, z: 0 },
    { x: 0, y: L, z: 0 },
    { x: W, y: L, z: 0 },
    { x: 0, y: 0, z: H },
    { x: W, y: 0, z: H },
    { x: 0, y: L, z: H },
    { x: W, y: L, z: H },
  ];
  const proyCorners = corners.map((p) => proyectar(p, vista));
  const minSx = Math.min(...proyCorners.map((p) => p.sx));
  const maxSx = Math.max(...proyCorners.map((p) => p.sx));
  const minSy = Math.min(...proyCorners.map((p) => p.sy));
  const maxSy = Math.max(...proyCorners.map((p) => p.sy));

  const pad = 64;
  const anchoSpan = Math.max(maxSx - minSx, 0.5);
  const altoSpan = Math.max(maxSy - minSy, 0.5);
  const scale = Math.min(560 / anchoSpan, 460 / altoSpan);
  const sw = anchoSpan * scale + pad * 2;
  const sh = altoSpan * scale + pad * 2;

  const px = (p: Pt3): { x: number; y: number } => {
    const { sx, sy } = proyectar(p, vista);
    return { x: pad + (sx - minSx) * scale, y: pad + (sy - minSy) * scale };
  };
  const XY = (p: Pt3): { X: string; Y: string } => {
    const c = px(p);
    return { X: coord(c.x, 1), Y: coord(c.y, 1) };
  };

  const linea = (a: Pt3, b: Pt3, extra: string): string => {
    const pa = XY(a);
    const pb = XY(b);
    return `<line x1="${pa.X}" y1="${pa.Y}" x2="${pb.X}" y2="${pb.Y}" ${extra}/>`;
  };
  const poli = (pts: Pt3[], extra: string): string => {
    const puntos = pts.map((p) => `${XY(p).X},${XY(p).Y}`).join(' ');
    return `<polyline points="${puntos}" ${extra}/>`;
  };
  const circulo = (p: Pt3, r: number, extra: string): string => {
    const c = XY(p);
    return `<circle cx="${c.X}" cy="${c.Y}" r="${coord(r, 1)}" ${extra}/>`;
  };
  const texto = (p: Pt3, contenido: string, extra: string, dx = 0, dy = 0, rotar = false): string => {
    const c = px(p);
    const x = coord(c.x + dx, 1);
    const y = coord(c.y + dy, 1);
    const transform = rotar ? ` transform="rotate(-90 ${x} ${y})"` : '';
    return `<text x="${x}" y="${y}" ${extra}${transform}>${contenido}</text>`;
  };

  let s = `<svg viewBox="0 0 ${coord(sw, 0)} ${coord(sh, 0)}" xmlns="http://www.w3.org/2000/svg" font-family="ui-monospace,Menlo,Consolas,monospace">`;

  // piso: relleno sutil para dar noción de plano de apoyo
  s += poli(
    [
      { x: 0, y: 0, z: 0 },
      { x: W, y: 0, z: 0 },
      { x: W, y: L, z: 0 },
      { x: 0, y: L, z: 0 },
      { x: 0, y: 0, z: 0 },
    ],
    'fill="rgba(255,255,255,.02)" stroke="none"'
  );

  // cubo de alambre: piso, techo, verticales
  const EDGE = 'stroke="rgba(255,255,255,.22)" stroke-width="1" fill="none"';
  s += linea({ x: 0, y: 0, z: 0 }, { x: W, y: 0, z: 0 }, EDGE);
  s += linea({ x: W, y: 0, z: 0 }, { x: W, y: L, z: 0 }, EDGE);
  s += linea({ x: W, y: L, z: 0 }, { x: 0, y: L, z: 0 }, EDGE);
  s += linea({ x: 0, y: L, z: 0 }, { x: 0, y: 0, z: 0 }, EDGE);
  s += linea({ x: 0, y: 0, z: H }, { x: W, y: 0, z: H }, EDGE);
  s += linea({ x: W, y: 0, z: H }, { x: W, y: L, z: H }, EDGE);
  s += linea({ x: W, y: L, z: H }, { x: 0, y: L, z: H }, EDGE);
  s += linea({ x: 0, y: L, z: H }, { x: 0, y: 0, z: H }, EDGE);
  s += linea({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: H }, EDGE);
  s += linea({ x: W, y: 0, z: 0 }, { x: W, y: 0, z: H }, EDGE);
  s += linea({ x: 0, y: L, z: 0 }, { x: 0, y: L, z: H }, EDGE);
  s += linea({ x: W, y: L, z: 0 }, { x: W, y: L, z: H }, EDGE);

  // etiquetas de muro, con sufijo "(abierto)" si es vacío. En vistas
  // ortográficas, dos etiquetas caen exactamente superpuestas cuando la
  // vista deja caer el eje que las distingue (frontal/posterior se
  // superponen en la vista "frontal" y "lateral" deja caer izquierdo/
  // derecho en "lateral") — se omiten en vez de mostrar texto ilegible
  // amontonado; isométrica y superior sí distinguen los 4 muros.
  //
  // Izquierdo/derecho van rotadas -90° (leen de abajo hacia arriba,
  // pegadas a la arista vertical de su lado) en vez de horizontales: un
  // texto horizontal centrado ("IZQUIERDO"/"POSTERIOR", las palabras más
  // largas) con `text-anchor="middle"` se extiende ~50-60px a cada lado
  // del punto de anclaje, que podía superar el padding del viewBox y
  // salirse del área visible del gráfico — rotado, el texto ocupa el
  // ancho de su altura de fuente (~10px), no el de su longitud, así que
  // encaja con un margen mucho más chico y sin riesgo de recorte.
  const LABEL = 'fill="#6E6E75" font-size="10.5" letter-spacing="1.2" text-anchor="middle"';
  const LABEL_ABIERTO = 'fill="#5A5A61" font-size="10.5" letter-spacing="1.2" text-anchor="middle" font-style="italic"';
  const etiquetaMuro = (p: Pt3, nombre: string, vacio: boolean, dx: number, dy: number, rotar = false): string =>
    texto(p, vacio ? nombre + t.aberturaSufijo : nombre, vacio ? LABEL_ABIERTO : LABEL, dx, dy, rotar);
  const ejeYVisible = vista !== 'frontal';
  const ejeXVisible = vista !== 'lateral';
  if (ejeYVisible) {
    s += etiquetaMuro({ x: W / 2, y: 0, z: H }, t.muroFrontalCorto, muros.frontal === 'vacio', 0, -16);
    s += etiquetaMuro({ x: W / 2, y: L, z: H }, t.muroPosteriorCorto, muros.posterior === 'vacio', 0, -16);
  }
  if (ejeXVisible) {
    s += etiquetaMuro({ x: 0, y: L / 2, z: H }, t.muroIzquierdoCorto, muros.izquierdo === 'vacio', -14, 0, true);
    s += etiquetaMuro({ x: W, y: L / 2, z: H }, t.muroDerechoCorto, muros.derecho === 'vacio', 14, 0, true);
  }

  // triángulo de escucha
  const spkIzq3: Pt3 = { x: disp.parlanteIzq.x, y: disp.parlanteIzq.y, z: h };
  const spkDer3: Pt3 = { x: disp.parlanteDer.x, y: disp.parlanteDer.y, z: h };
  const dulce3: Pt3 = { x: disp.puntoDulce.x, y: disp.puntoDulce.y, z: h };
  const TRIANGULO = 'stroke="rgba(255,255,255,.5)" stroke-width="1" stroke-dasharray="4 3" fill="none"';
  s += linea(spkIzq3, dulce3, TRIANGULO);
  s += linea(spkDer3, dulce3, TRIANGULO);

  // reflexiones: laterales y trasera se omiten si el muro correspondiente es "vacío"
  const REFLEXION_PATH = 'stroke="rgba(199,173,124,.4)" stroke-width="1" stroke-dasharray="2 3" fill="none"';
  const REFLEXION_PUNTO = 'fill="none" stroke="#C7AD7C" stroke-width="1.2"';
  const REFLEXION_TEXTO = 'fill="#C7AD7C" font-size="9.5"';

  interface Reflexion {
    desde: Pt3;
    punto: Pt3;
    distanciaM: number;
    lado: 'izq' | 'der';
  }
  const reflexiones: Reflexion[] = [];
  if (muros.izquierdo !== 'vacio') {
    reflexiones.push({ desde: spkIzq3, punto: { x: disp.reflexionIzq.x, y: disp.reflexionIzq.y, z: h }, distanciaM: disp.distanciaLateralIzqM, lado: 'izq' });
  }
  if (muros.derecho !== 'vacio') {
    reflexiones.push({ desde: spkDer3, punto: { x: disp.reflexionDer.x, y: disp.reflexionDer.y, z: h }, distanciaM: disp.distanciaLateralDerM, lado: 'der' });
  }
  if (muros.posterior !== 'vacio') {
    reflexiones.push({ desde: spkIzq3, punto: { x: disp.reflexionTraseraIzq.x, y: disp.reflexionTraseraIzq.y, z: h }, distanciaM: disp.distanciaTraseraIzqM, lado: 'izq' });
    reflexiones.push({ desde: spkDer3, punto: { x: disp.reflexionTraseraDer.x, y: disp.reflexionTraseraDer.y, z: h }, distanciaM: disp.distanciaTraseraDerM, lado: 'der' });
  }
  // techo y piso no tienen opción "vacío": siempre se dibujan
  reflexiones.push({ desde: spkIzq3, punto: { x: disp.reflexionTechoIzq.x, y: disp.reflexionTechoIzq.y, z: H }, distanciaM: disp.distanciaTechoIzqM, lado: 'izq' });
  reflexiones.push({ desde: spkDer3, punto: { x: disp.reflexionTechoDer.x, y: disp.reflexionTechoDer.y, z: H }, distanciaM: disp.distanciaTechoDerM, lado: 'der' });
  reflexiones.push({ desde: spkIzq3, punto: { x: disp.reflexionPisoIzq.x, y: disp.reflexionPisoIzq.y, z: 0 }, distanciaM: disp.distanciaPisoIzqM, lado: 'izq' });
  reflexiones.push({ desde: spkDer3, punto: { x: disp.reflexionPisoDer.x, y: disp.reflexionPisoDer.y, z: 0 }, distanciaM: disp.distanciaPisoDerM, lado: 'der' });

  for (const r of reflexiones) {
    s += poli([r.desde, r.punto, dulce3], REFLEXION_PATH);
    s += circulo(r.punto, 2.8, REFLEXION_PUNTO);
    const dx = r.lado === 'izq' ? -8 : 8;
    const anchor = r.lado === 'izq' ? 'end' : 'start';
    s += texto(r.punto, num(r.distanciaM, 2, idioma) + ' m', REFLEXION_TEXTO + ` text-anchor="${anchor}"`, dx, -6);
  }

  // parlantes: caja de alambre (volumen ilustrativo, ver ANCHO/PROFUNDIDAD/ALTO_PARLANTE_M)
  const cajaParlante = (centro: Pt3): string => {
    const aw = ANCHO_PARLANTE_M / 2;
    const dw = PROFUNDIDAD_PARLANTE_M / 2;
    const hw = ALTO_PARLANTE_M / 2;
    const c000: Pt3 = { x: centro.x - aw, y: centro.y - dw, z: centro.z - hw };
    const c100: Pt3 = { x: centro.x + aw, y: centro.y - dw, z: centro.z - hw };
    const c010: Pt3 = { x: centro.x - aw, y: centro.y + dw, z: centro.z - hw };
    const c110: Pt3 = { x: centro.x + aw, y: centro.y + dw, z: centro.z - hw };
    const c001: Pt3 = { x: centro.x - aw, y: centro.y - dw, z: centro.z + hw };
    const c101: Pt3 = { x: centro.x + aw, y: centro.y - dw, z: centro.z + hw };
    const c011: Pt3 = { x: centro.x - aw, y: centro.y + dw, z: centro.z + hw };
    const c111: Pt3 = { x: centro.x + aw, y: centro.y + dw, z: centro.z + hw };
    const CAJA = 'stroke="#ECECEE" stroke-width="1.1" fill="rgba(236,236,238,.06)"';
    let caja = '';
    caja += poli([c000, c100, c110, c010, c000], CAJA);
    caja += poli([c001, c101, c111, c011, c001], CAJA);
    caja += linea(c000, c001, CAJA);
    caja += linea(c100, c101, CAJA);
    caja += linea(c010, c011, CAJA);
    caja += linea(c110, c111, CAJA);
    return caja;
  };
  s += cajaParlante(spkIzq3) + cajaParlante(spkDer3);
  s += texto(spkIzq3, 'L', 'fill="#ECECEE" font-size="9.5" text-anchor="middle"', 0, -22);
  s += texto(spkDer3, 'R', 'fill="#ECECEE" font-size="9.5" text-anchor="middle"', 0, -22);

  // punto dulce
  s += circulo(dulce3, 4, 'fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1" stroke-dasharray="3 3"');
  s += circulo(dulce3, 3.5, 'fill="#ECECEE"');
  s += texto(dulce3, t.puntoDulce, 'fill="#ECECEE" font-size="10" text-anchor="middle"', 0, 18);

  // dimensiones (ancho, largo, alto) a lo largo de las aristas del piso/
  // vertical — largo y alto rotadas -90° por la misma razón que
  // izquierdo/derecho arriba: pegadas a su arista, sin extenderse fuera
  // del área visible del gráfico.
  s += texto({ x: W / 2, y: 0, z: 0 }, num(W, 1, idioma) + ' m', 'fill="#8C8C93" font-size="10.5" text-anchor="middle"', 0, 20);
  s += texto({ x: 0, y: L / 2, z: 0 }, num(L, 1, idioma) + ' m', 'fill="#8C8C93" font-size="10.5" text-anchor="middle"', -14, 0, true);
  s += texto({ x: 0, y: 0, z: H / 2 }, num(H, 2, idioma) + ' m', 'fill="#8C8C93" font-size="10.5" text-anchor="middle"', -14, 0, true);

  s += '</svg>';
  return s;
}
