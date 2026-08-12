import { test } from 'node:test';
import assert from 'node:assert/strict';
import { num, numConSigno, coord } from './numeros.ts';

test('num: es-CL usa coma decimal y punto de miles', () => {
  assert.equal(num(3.6, 1, 'es'), '3,6');
  assert.equal(num(43000, 0, 'es'), '43.000');
});

test('num: en-US usa punto decimal y coma de miles', () => {
  assert.equal(num(3.6, 1, 'en'), '3.6');
  assert.equal(num(43000, 0, 'en'), '43,000');
});

test('numConSigno: signo menos tipográfico (U+2212), no hyphen-minus', () => {
  assert.equal(numConSigno(-3.55, 1, 'es'), '−3,6');
  assert.equal(numConSigno(6.07, 1, 'es'), '+6,1');
});

test('coord: siempre punto ASCII — no toma idioma como parámetro, por diseño (la geometría SVG no se localiza)', () => {
  assert.equal(coord(1.234), '1.2');
  assert.equal(coord(43000, 0), '43000');
});
