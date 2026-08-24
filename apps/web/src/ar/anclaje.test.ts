import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolverAnclaje, anclarPunto } from './anclaje.ts';
import { calcularDisposicion } from '../../../../packages/engine/src/sala.ts';

const CERCA = 1e-9;

test('resolverAnclaje: visor parado 2m hacia -z de la línea de toques → ejeX=(1,0,0), arriba=(0,1,0), ejeProfundidad=(0,0,-1)', () => {
  const a = resolverAnclaje({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 0, z: -2 });
  assert.ok(Math.abs(a.ejeX.x - 1) < CERCA && Math.abs(a.ejeX.y) < CERCA && Math.abs(a.ejeX.z) < CERCA);
  assert.deepEqual(a.arriba, { x: 0, y: 1, z: 0 });
  assert.ok(Math.abs(a.ejeProfundidad.x) < CERCA && Math.abs(a.ejeProfundidad.y) < CERCA && Math.abs(a.ejeProfundidad.z + 1) < CERCA);
});

test('resolverAnclaje: elige el candidato de ejeProfundidad más cercano a donde está parado el visor, no el otro', () => {
  // toque2 al este, visor parado hacia +z en vez de -z — el candidato
  // elegido tiene que invertirse respecto del test anterior.
  const a = resolverAnclaje({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 0, z: 2 });
  assert.ok(a.ejeProfundidad.z > 0, 'ejeProfundidad debería apuntar hacia +z, como la posición del visor');
});

test('resolverAnclaje: la altura del visor no afecta la elección (se proyecta al plano horizontal)', () => {
  const conVisorAlto = resolverAnclaje({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 1.7, z: -2 });
  const conVisorAlNivelDelPiso = resolverAnclaje({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 0, z: -2 });
  assert.deepEqual(conVisorAlto.ejeProfundidad, conVisorAlNivelDelPiso.ejeProfundidad);
});

test('resolverAnclaje: toques prácticamente coincidentes usan el eje X de emergencia (1,0,0), nunca NaN', () => {
  const a = resolverAnclaje({ x: 2, y: 0, z: 3 }, { x: 2.001, y: 0, z: 3.001 }, { x: 2, y: 1.7, z: 1 });
  assert.deepEqual(a.ejeX, { x: 1, y: 0, z: 0 });
  for (const v of [a.origen, a.ejeX, a.ejeProfundidad, a.arriba]) {
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));
  }
});

test('resolverAnclaje: visor exactamente sobre la línea de los 2 toques (sin componente horizontal perpendicular) no produce NaN, usa un default declarado', () => {
  const a = resolverAnclaje({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0.5, y: 1.7, z: 0 });
  for (const v of [a.ejeProfundidad]) {
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));
  }
});

test('anclarPunto: origen en 0, ejes canónicos — reproduce (x,alturaM,-y) a mano', () => {
  const anclaje = { origen: { x: 0, y: 0, z: 0 }, ejeX: { x: 1, y: 0, z: 0 }, ejeProfundidad: { x: 0, y: 0, z: -1 }, arriba: { x: 0, y: 1, z: 0 } };
  const v = anclarPunto(anclaje, { x: 2, y: 3 }, 1);
  assert.equal(v.x, 2);
  assert.equal(v.y, 1);
  assert.equal(v.z, -3);
});

test('anclarPunto: con origen desplazado, suma el offset', () => {
  const anclaje = { origen: { x: 10, y: 0.5, z: -4 }, ejeX: { x: 1, y: 0, z: 0 }, ejeProfundidad: { x: 0, y: 0, z: -1 }, arriba: { x: 0, y: 1, z: 0 } };
  const v = anclarPunto(anclaje, { x: 1, y: 1 }, 1);
  assert.equal(v.x, 11);
  assert.equal(v.y, 1.5);
  assert.equal(v.z, -5);
});

test('anclarPunto: cada punto de una DisposicionSala real cae donde predice la fórmula manual, dado un anclaje fijo', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  const disp = calcularDisposicion(sala);
  const anclaje = resolverAnclaje({ x: 5, y: 0, z: 5 }, { x: 6, y: 0, z: 5 }, { x: 0, y: 0, z: -1 });

  function esperado(p: { x: number; y: number }, alturaM: number) {
    return {
      x: anclaje.origen.x + anclaje.ejeX.x * p.x + anclaje.ejeProfundidad.x * p.y + anclaje.arriba.x * alturaM,
      y: anclaje.origen.y + anclaje.ejeX.y * p.x + anclaje.ejeProfundidad.y * p.y + anclaje.arriba.y * alturaM,
      z: anclaje.origen.z + anclaje.ejeX.z * p.x + anclaje.ejeProfundidad.z * p.y + anclaje.arriba.z * alturaM,
    };
  }

  for (const [p, alturaM] of [
    [disp.parlanteIzq, disp.alturaM],
    [disp.parlanteDer, disp.alturaM],
    [disp.puntoDulce, disp.alturaM],
    [disp.reflexionTechoIzq, sala.altoM],
    [disp.reflexionPisoDer, 0],
  ] as const) {
    const v = anclarPunto(anclaje, p, alturaM);
    const e = esperado(p, alturaM);
    assert.ok(Math.abs(v.x - e.x) < CERCA);
    assert.ok(Math.abs(v.y - e.y) < CERCA);
    assert.ok(Math.abs(v.z - e.z) < CERCA);
  }
});
