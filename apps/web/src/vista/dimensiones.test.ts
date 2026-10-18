// PURO — sin DOM ni motor. Lee index.html de disco para comprobar que los
// límites del HTML y los de validarDimension son los mismos números.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LIMITES_DIMENSION_M, validarDimension } from './dimensiones.ts';
import type { DimensionSala } from './dimensiones.ts';

test('validarDimension: dentro del rango → ok; los bordes exactos son válidos', () => {
  assert.equal(validarDimension('W', 3.2), 'ok');
  assert.equal(validarDimension('W', 2.5), 'ok');
  assert.equal(validarDimension('W', 7), 'ok');
  assert.equal(validarDimension('H', 2.2), 'ok');
  assert.equal(validarDimension('H', 3.5), 'ok');
});

test('validarDimension: fuera del rango → fuera-de-rango (por debajo y por encima)', () => {
  assert.equal(validarDimension('W', 2.4), 'fuera-de-rango');
  assert.equal(validarDimension('W', 7.1), 'fuera-de-rango');
  assert.equal(validarDimension('L', 2.9), 'fuera-de-rango');
  assert.equal(validarDimension('L', 9.01), 'fuera-de-rango');
  assert.equal(validarDimension('H', 3.6), 'fuera-de-rango');
});

test('validarDimension: vacío o mal escrito (NaN, infinito) → no-numerica, nunca ok', () => {
  assert.equal(validarDimension('W', Number.NaN), 'no-numerica');
  assert.equal(validarDimension('L', Number.POSITIVE_INFINITY), 'no-numerica');
});

test('los límites del HTML (min/max de #in-W/#in-L/#in-H) son los de LIMITES_DIMENSION_M', () => {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  for (const dim of ['W', 'L', 'H'] as DimensionSala[]) {
    const m = html.match(new RegExp(`<input[^>]*id="in-${dim}"[^>]*>`));
    assert.ok(m, `no se encontró #in-${dim} en index.html`);
    const min = m![0].match(/min="([\d.]+)"/);
    const max = m![0].match(/max="([\d.]+)"/);
    assert.equal(Number(min?.[1]), LIMITES_DIMENSION_M[dim].min, `min de #in-${dim}`);
    assert.equal(Number(max?.[1]), LIMITES_DIMENSION_M[dim].max, `max de #in-${dim}`);
    assert.match(m![0], /type="number"/, `#in-${dim} debe ser un campo numérico`);
  }
});
