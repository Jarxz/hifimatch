import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDisposicion } from '../../../../packages/engine/src/sala.ts';
import type { Sala } from '../../../../packages/engine/src/sala.ts';
import { construirPlanoSvg } from './plano.ts';

const SALA_VECTOR: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // motor-mvp.md sección 4

test('vector de motor-mvp.md sección 4 (W=3,6, L=5,0): el SVG generado está bien formado', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const svg = construirPlanoSvg(SALA_VECTOR, disp);
  assert.match(svg, /^<svg viewBox="0 0 \d+ \d+"/);
  assert.match(svg, /<\/svg>$/);
  assert.equal((svg.match(/<rect/g) ?? []).length, 3); // sala + 2 parlantes
  assert.equal((svg.match(/<circle/g) ?? []).length, 4); // 2 reflexiones + anillo del punto dulce + punto dulce
});

test('coordenadas geométricas: nunca coma decimal (un atributo "x=81,4" es inválido y el navegador lo descarta)', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const svg = construirPlanoSvg(SALA_VECTOR, disp);

  const ATRIBUTOS_GEOMETRICOS = ['x', 'y', 'cx', 'cy', 'r', 'width', 'height', 'x1', 'y1', 'x2', 'y2'];
  for (const attr of ATRIBUTOS_GEOMETRICOS) {
    for (const m of svg.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, 'g'))) {
      assert.ok(!m[1]!.includes(','), `atributo ${attr}="${m[1]}" tiene una coma — ¿se usó num() en vez de coord()?`);
    }
  }
  const viewBox = svg.match(/viewBox="([^"]*)"/)?.[1];
  assert.ok(viewBox && !viewBox.includes(','), 'viewBox no debería tener comas');
});

test('los <text> de metros y distancia sí usan num() — hoy en español, coma decimal', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const svg = construirPlanoSvg(SALA_VECTOR, disp);
  assert.match(svg, />3,6 m</); // ancho
  assert.match(svg, />5,0 m</); // largo
  assert.match(svg, />2,6 m</); // distancia de escucha ≈2,574 redondeada a 1 decimal
});
