/**
 * Traduce una `DisposicionSala` (metros, marco de referencia de sala.ts)
 * a una escena anclada en el espacio real — puro, sin `three`, sin DOM.
 * Recorre los mismos elementos que ya dibuja `vista/plano.ts`
 * (`construirPlanoSvg`): cubo de alambre de la sala, triángulo de
 * escucha, y las 8 reflexiones (laterales, trasera, frontal, techo,
 * piso), omitiendo las de un muro `'vacio'` — mismo criterio, mismo
 * "wireframe honesto, sin fingir opacidad" que ya declara la cabecera de
 * plano.ts: sólo líneas y puntos, ningún material opaco que sugiera una
 * superficie resuelta que este modelo no calcula.
 *
 * La lista de "qué reflexión se omite por muro vacío" está DUPLICADA a
 * propósito desde plano.ts (líneas ~318-336 al momento de escribir esto)
 * en vez de extraída a un helper compartido — alcance de esta ronda. Si
 * `plano.ts` cambia esa lógica, revisar acá también.
 */
import type { Sala, DisposicionSala, Punto } from '../../../../packages/engine/src/sala.ts';
import type { MurosVista } from '../vista/plano.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import type { Anclaje, Vec3 } from './anclaje.ts';
import { anclarPunto } from './anclaje.ts';
import { num } from '../formato/numeros.ts';
import { textosDe } from '../idioma/idioma.ts';

export interface SegmentoAr {
  a: Vec3;
  b: Vec3;
  tipo: 'arista-sala' | 'triangulo' | 'reflexion';
}

export type TipoPuntoAr = 'parlante-izq' | 'parlante-der' | 'punto-dulce' | 'reflexion';

export interface PuntoAr {
  p: Vec3;
  tipo: TipoPuntoAr;
  etiqueta: string;
}

export interface EscenaAr {
  segmentos: SegmentoAr[];
  puntos: PuntoAr[];
}

interface DescriptorReflexion {
  desde: Vec3;
  punto: Punto;
  alturaM: number;
  distanciaM: number;
  lado: 'izq' | 'der';
}

export function construirEscenaAr(sala: Sala, disp: DisposicionSala, muros: MurosVista, anclaje: Anclaje, idioma: Idioma): EscenaAr {
  const { anchoM: W, largoM: L, altoM: H } = sala;
  const h = disp.alturaM;
  const t = textosDe(idioma).resultado.plano;

  const anclarXYZ = (x: number, y: number, z: number): Vec3 => anclarPunto(anclaje, { x, y }, z);
  const anclar2 = (p: Punto, z: number): Vec3 => anclarPunto(anclaje, p, z);

  const segmentos: SegmentoAr[] = [];
  const puntos: PuntoAr[] = [];

  // Cubo de alambre de la sala — mismas 12 aristas que plano.ts.
  const aristas: Array<[Vec3, Vec3]> = [
    [anclarXYZ(0, 0, 0), anclarXYZ(W, 0, 0)],
    [anclarXYZ(W, 0, 0), anclarXYZ(W, L, 0)],
    [anclarXYZ(W, L, 0), anclarXYZ(0, L, 0)],
    [anclarXYZ(0, L, 0), anclarXYZ(0, 0, 0)],
    [anclarXYZ(0, 0, H), anclarXYZ(W, 0, H)],
    [anclarXYZ(W, 0, H), anclarXYZ(W, L, H)],
    [anclarXYZ(W, L, H), anclarXYZ(0, L, H)],
    [anclarXYZ(0, L, H), anclarXYZ(0, 0, H)],
    [anclarXYZ(0, 0, 0), anclarXYZ(0, 0, H)],
    [anclarXYZ(W, 0, 0), anclarXYZ(W, 0, H)],
    [anclarXYZ(0, L, 0), anclarXYZ(0, L, H)],
    [anclarXYZ(W, L, 0), anclarXYZ(W, L, H)],
  ];
  for (const [a, b] of aristas) segmentos.push({ a, b, tipo: 'arista-sala' });

  // Triángulo de escucha.
  const spkIzq3 = anclar2(disp.parlanteIzq, h);
  const spkDer3 = anclar2(disp.parlanteDer, h);
  const dulce3 = anclar2(disp.puntoDulce, h);
  segmentos.push({ a: spkIzq3, b: dulce3, tipo: 'triangulo' });
  segmentos.push({ a: spkDer3, b: dulce3, tipo: 'triangulo' });

  puntos.push({ p: spkIzq3, tipo: 'parlante-izq', etiqueta: 'L' });
  puntos.push({ p: spkDer3, tipo: 'parlante-der', etiqueta: 'R' });
  puntos.push({ p: dulce3, tipo: 'punto-dulce', etiqueta: t.puntoDulce });

  // Reflexiones — mismo criterio de omisión por muro "vacío" que plano.ts.
  const reflexiones: DescriptorReflexion[] = [];
  if (muros.frontal !== 'vacio') {
    reflexiones.push({ desde: spkIzq3, punto: disp.reflexionFrontalIzq, alturaM: h, distanciaM: disp.distanciaFrontalIzqM, lado: 'izq' });
    reflexiones.push({ desde: spkDer3, punto: disp.reflexionFrontalDer, alturaM: h, distanciaM: disp.distanciaFrontalDerM, lado: 'der' });
  }
  if (muros.izquierdo !== 'vacio') {
    reflexiones.push({ desde: spkIzq3, punto: disp.reflexionIzq, alturaM: h, distanciaM: disp.distanciaLateralIzqM, lado: 'izq' });
  }
  if (muros.derecho !== 'vacio') {
    reflexiones.push({ desde: spkDer3, punto: disp.reflexionDer, alturaM: h, distanciaM: disp.distanciaLateralDerM, lado: 'der' });
  }
  if (muros.posterior !== 'vacio') {
    reflexiones.push({ desde: spkIzq3, punto: disp.reflexionTraseraIzq, alturaM: h, distanciaM: disp.distanciaTraseraIzqM, lado: 'izq' });
    reflexiones.push({ desde: spkDer3, punto: disp.reflexionTraseraDer, alturaM: h, distanciaM: disp.distanciaTraseraDerM, lado: 'der' });
  }
  // Techo y piso no tienen opción "vacío": siempre se dibujan.
  reflexiones.push({ desde: spkIzq3, punto: disp.reflexionTechoIzq, alturaM: H, distanciaM: disp.distanciaTechoIzqM, lado: 'izq' });
  reflexiones.push({ desde: spkDer3, punto: disp.reflexionTechoDer, alturaM: H, distanciaM: disp.distanciaTechoDerM, lado: 'der' });
  reflexiones.push({ desde: spkIzq3, punto: disp.reflexionPisoIzq, alturaM: 0, distanciaM: disp.distanciaPisoIzqM, lado: 'izq' });
  reflexiones.push({ desde: spkDer3, punto: disp.reflexionPisoDer, alturaM: 0, distanciaM: disp.distanciaPisoDerM, lado: 'der' });

  for (const r of reflexiones) {
    const punto3 = anclar2(r.punto, r.alturaM);
    segmentos.push({ a: r.desde, b: punto3, tipo: 'reflexion' });
    segmentos.push({ a: punto3, b: dulce3, tipo: 'reflexion' });
    puntos.push({ p: punto3, tipo: 'reflexion', etiqueta: `${num(r.distanciaM, 2, idioma)} m` });
  }

  return { segmentos, puntos };
}
