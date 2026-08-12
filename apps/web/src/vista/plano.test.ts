import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDisposicion } from '../../../../packages/engine/src/sala.ts';
import type { Sala } from '../../../../packages/engine/src/sala.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { construirPlanoSvg } from './plano.ts';

const SALA_VECTOR: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // motor-mvp.md sección 4
const IDIOMAS: readonly Idioma[] = ['es', 'en'];

test('vector de motor-mvp.md sección 4 (W=3,6, L=5,0): el SVG generado está bien formado, en cualquier idioma', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  for (const idioma of IDIOMAS) {
    const svg = construirPlanoSvg(SALA_VECTOR, disp, idioma);
    assert.match(svg, /^<svg viewBox="0 0 \d+ \d+"/, idioma);
    assert.match(svg, /<\/svg>$/, idioma);
    assert.equal((svg.match(/<rect/g) ?? []).length, 3, idioma); // sala + 2 parlantes
    assert.equal((svg.match(/<circle/g) ?? []).length, 4, idioma); // 2 reflexiones + anillo del punto dulce + punto dulce
  }
});

test('coordenadas geométricas: nunca coma decimal en NINGÚN idioma (un atributo "x=81,4" es inválido y el navegador lo descarta)', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const ATRIBUTOS_GEOMETRICOS = ['x', 'y', 'cx', 'cy', 'r', 'width', 'height', 'x1', 'y1', 'x2', 'y2'];
  for (const idioma of IDIOMAS) {
    const svg = construirPlanoSvg(SALA_VECTOR, disp, idioma);
    for (const attr of ATRIBUTOS_GEOMETRICOS) {
      for (const m of svg.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, 'g'))) {
        assert.ok(!m[1]!.includes(','), `[${idioma}] atributo ${attr}="${m[1]}" tiene una coma — ¿se usó num() en vez de coord()?`);
      }
    }
    const viewBox = svg.match(/viewBox="([^"]*)"/)?.[1];
    assert.ok(viewBox && !viewBox.includes(','), `[${idioma}] viewBox no debería tener comas`);
  }
});

test('los <text> de metros y distancia usan num() por locale — coma en español, punto en inglés', () => {
  const disp = calcularDisposicion(SALA_VECTOR);

  const svgEs = construirPlanoSvg(SALA_VECTOR, disp, 'es');
  assert.match(svgEs, />3,6 m</); // ancho
  assert.match(svgEs, />5,0 m</); // largo
  assert.match(svgEs, />2,6 m</); // distancia de escucha ≈2,574 redondeada a 1 decimal
  assert.match(svgEs, />MURO FRONTAL</);
  assert.match(svgEs, />punto dulce</);

  const svgEn = construirPlanoSvg(SALA_VECTOR, disp, 'en');
  assert.match(svgEn, />3\.6 m</);
  assert.match(svgEn, />5\.0 m</);
  assert.match(svgEn, />2\.6 m</);
  assert.match(svgEn, />FRONT WALL</);
  assert.match(svgEn, />sweet spot</);
});
