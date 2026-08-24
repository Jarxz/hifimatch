import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDisposicion } from '../../../../packages/engine/src/sala.ts';
import { resolverAnclaje, anclarPunto } from './anclaje.ts';
import { construirEscenaAr, construirPlanoFrontalPreview } from './geometriaAr.ts';
import type { MurosVista } from '../vista/plano.ts';

const SALA = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
const DISP = calcularDisposicion(SALA);
const ANCLAJE = resolverAnclaje({ x: 1, y: 0, z: 1 }, { x: 2, y: 0, z: 1 }, { x: 0, y: 0, z: -1 });
const MUROS_TODOS: MurosVista = { frontal: 'yesoCarton', posterior: 'yesoCarton', izquierdo: 'yesoCarton', derecho: 'yesoCarton' };

// 8 superficies reflectoras en total: frontal(2, izq+der) + izquierdo(1) +
// derecho(1) + posterior(2, izq+der) + techo(2, siempre) + piso(2, siempre)
// = 10 reflexiones posibles, cada una con 2 tramos (desde el parlante y
// hacia el punto dulce) = 20 tramos.
test('construirEscenaAr: con los 4 muros sólidos, arma 12 aristas + 2 tramos de triángulo + 20 tramos de reflexión (10 reflexiones × 2)', () => {
  const escena = construirEscenaAr(SALA, DISP, MUROS_TODOS, ANCLAJE, 'es');
  const aristas = escena.segmentos.filter((s) => s.tipo === 'arista-sala');
  const triangulo = escena.segmentos.filter((s) => s.tipo === 'triangulo');
  const reflexion = escena.segmentos.filter((s) => s.tipo === 'reflexion');
  assert.equal(aristas.length, 12);
  assert.equal(triangulo.length, 2);
  assert.equal(reflexion.length, 20);
});

test('construirEscenaAr: 2 parlantes + 1 punto dulce + 10 puntos de reflexión = 13 puntos, con los 4 muros sólidos', () => {
  const escena = construirEscenaAr(SALA, DISP, MUROS_TODOS, ANCLAJE, 'es');
  assert.equal(escena.puntos.filter((p) => p.tipo === 'parlante-izq').length, 1);
  assert.equal(escena.puntos.filter((p) => p.tipo === 'parlante-der').length, 1);
  assert.equal(escena.puntos.filter((p) => p.tipo === 'punto-dulce').length, 1);
  assert.equal(escena.puntos.filter((p) => p.tipo === 'reflexion').length, 10);
});

test('construirEscenaAr: muro izquierdo "vacío" omite exactamente su reflexión (1 punto, 2 tramos menos)', () => {
  const muros: MurosVista = { ...MUROS_TODOS, izquierdo: 'vacio' };
  const escena = construirEscenaAr(SALA, DISP, muros, ANCLAJE, 'es');
  assert.equal(escena.puntos.filter((p) => p.tipo === 'reflexion').length, 9);
  assert.equal(escena.segmentos.filter((s) => s.tipo === 'reflexion').length, 18);
});

test('construirEscenaAr: muro frontal "vacío" omite sus 2 reflexiones (izq y der)', () => {
  const muros: MurosVista = { ...MUROS_TODOS, frontal: 'vacio' };
  const escena = construirEscenaAr(SALA, DISP, muros, ANCLAJE, 'es');
  assert.equal(escena.puntos.filter((p) => p.tipo === 'reflexion').length, 8);
});

test('construirEscenaAr: con los 4 muros vacíos, sólo sobreviven las 4 reflexiones de techo/piso (2 por lado)', () => {
  const muros: MurosVista = { frontal: 'vacio', posterior: 'vacio', izquierdo: 'vacio', derecho: 'vacio' };
  const escena = construirEscenaAr(SALA, DISP, muros, ANCLAJE, 'es');
  assert.equal(escena.puntos.filter((p) => p.tipo === 'reflexion').length, 4);
});

test('construirEscenaAr: los puntos de parlante/dulce caen exactamente donde predice anclarPunto aplicado a mano', () => {
  const escena = construirEscenaAr(SALA, DISP, MUROS_TODOS, ANCLAJE, 'es');
  const spkIzq = escena.puntos.find((p) => p.tipo === 'parlante-izq')!;
  const esperado = anclarPunto(ANCLAJE, DISP.parlanteIzq, DISP.alturaM);
  assert.deepEqual(spkIzq.p, esperado);
});

test('construirEscenaAr: etiqueta de parlante es literal L/R, punto dulce usa el texto del idioma, reflexión muestra la distancia en metros', () => {
  const escena = construirEscenaAr(SALA, DISP, MUROS_TODOS, ANCLAJE, 'es');
  assert.equal(escena.puntos.find((p) => p.tipo === 'parlante-izq')!.etiqueta, 'L');
  assert.equal(escena.puntos.find((p) => p.tipo === 'parlante-der')!.etiqueta, 'R');
  assert.match(escena.puntos.find((p) => p.tipo === 'punto-dulce')!.etiqueta, /punto dulce/);
  assert.match(escena.puntos.find((p) => p.tipo === 'reflexion')!.etiqueta, /^\d+,\d+ m$/);
});

test('construirEscenaAr en inglés: etiqueta de punto dulce y separador decimal de reflexión en inglés', () => {
  const escena = construirEscenaAr(SALA, DISP, MUROS_TODOS, ANCLAJE, 'en');
  assert.match(escena.puntos.find((p) => p.tipo === 'punto-dulce')!.etiqueta, /sweet spot/i);
  assert.match(escena.puntos.find((p) => p.tipo === 'reflexion')!.etiqueta, /^\d+\.\d+ m$/);
});

test('construirPlanoFrontalPreview: las 4 esquinas coinciden con anclarPunto aplicado a mano (origen, +ancho, +ancho+alto, +alto)', () => {
  const esquinas = construirPlanoFrontalPreview(SALA, ANCLAJE);
  assert.deepEqual(esquinas[0], anclarPunto(ANCLAJE, { x: 0, y: 0 }, 0));
  assert.deepEqual(esquinas[1], anclarPunto(ANCLAJE, { x: SALA.anchoM, y: 0 }, 0));
  assert.deepEqual(esquinas[2], anclarPunto(ANCLAJE, { x: SALA.anchoM, y: 0 }, SALA.altoM));
  assert.deepEqual(esquinas[3], anclarPunto(ANCLAJE, { x: 0, y: 0 }, SALA.altoM));
});

test('construirPlanoFrontalPreview: con el origen del anclaje en (0,0,0) y ejes canónicos, la esquina 0 es exactamente el origen', () => {
  const anclajeCanonico = resolverAnclaje({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: -1 });
  const esquinas = construirPlanoFrontalPreview(SALA, anclajeCanonico);
  assert.deepEqual(esquinas[0], { x: 0, y: 0, z: 0 });
});
