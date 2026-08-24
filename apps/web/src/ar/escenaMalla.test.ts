import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parametrosTubo, construirGrupoMallaParaUsdz } from './escenaMalla.ts';
import { calcularDisposicion } from '../../../../packages/engine/src/sala.ts';
import { construirEscenaAr } from './geometriaAr.ts';
import { ANCLAJE_CANONICO } from './anclaje.ts';
import type { MurosVista } from '../vista/plano.ts';

const CERCA = 1e-9;

test('parametrosTubo: longitud y centro de un segmento simple (3-4-5)', () => {
  const p = parametrosTubo({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
  assert.ok(Math.abs(p.longitudM - 5) < CERCA);
  assert.deepEqual(p.centro, { x: 1.5, y: 2, z: 0 });
});

test('parametrosTubo: segmento degenerado (mismo punto) da longitud 0', () => {
  const p = parametrosTubo({ x: 2, y: 1, z: 3 }, { x: 2, y: 1, z: 3 });
  assert.equal(p.longitudM, 0);
  assert.deepEqual(p.centro, { x: 2, y: 1, z: 3 });
});

test('parametrosTubo: centro y longitud en 3D general', () => {
  const p = parametrosTubo({ x: 1, y: 0, z: 1 }, { x: 1, y: 2.4, z: 1 });
  assert.ok(Math.abs(p.longitudM - 2.4) < CERCA);
  assert.deepEqual(p.centro, { x: 1, y: 1.2, z: 1 });
});

test('construirGrupoMallaParaUsdz: no tira construyendo THREE.Mesh/Group bajo node --test (sin DOM), y arma un hijo por segmento no degenerado + uno por punto', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  const disp = calcularDisposicion(sala);
  const muros: MurosVista = { frontal: 'yesoCarton', posterior: 'yesoCarton', izquierdo: 'yesoCarton', derecho: 'yesoCarton' };
  const escena = construirEscenaAr(sala, disp, muros, ANCLAJE_CANONICO, 'es');
  const grupo = construirGrupoMallaParaUsdz(escena);
  // 12 aristas + 2 triángulo + 20 tramos de reflexión (10 reflexiones × 2) = 34 segmentos, ninguno degenerado con esta sala
  assert.equal(grupo.children.length, escena.segmentos.length + escena.puntos.length);
  for (const hijo of grupo.children) {
    assert.equal((hijo as { isMesh?: boolean }).isMesh, true);
  }
});
