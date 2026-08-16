import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CREST_FACTOR_DB, nivelPromedioEstimadoDb } from './genero.ts';

test('nivelPromedioEstimadoDb resta el crest factor del género al pico objetivo', () => {
  assert.equal(nivelPromedioEstimadoDb(100, 'rockpop'), 100 - CREST_FACTOR_DB.rockpop);
  assert.equal(nivelPromedioEstimadoDb(100, 'jazzvocal'), 100 - CREST_FACTOR_DB.jazzvocal);
  assert.equal(nivelPromedioEstimadoDb(100, 'clasica'), 100 - CREST_FACTOR_DB.clasica);
});

test('vector: pico 100 dB, rock/pop (crest factor 10 dB) → nivel promedio estimado 90 dB', () => {
  assert.equal(nivelPromedioEstimadoDb(100, 'rockpop'), 90);
});

test('a mayor rango dinámico del género, menor nivel promedio estimado para el mismo pico (clásica < jazz/vocal < rock/pop)', () => {
  const pico = 100;
  const promedioRock = nivelPromedioEstimadoDb(pico, 'rockpop');
  const promedioJazz = nivelPromedioEstimadoDb(pico, 'jazzvocal');
  const promedioClasica = nivelPromedioEstimadoDb(pico, 'clasica');
  assert.ok(promedioClasica < promedioJazz);
  assert.ok(promedioJazz < promedioRock);
});

test('CREST_FACTOR_DB tiene los tres géneros, todos positivos', () => {
  for (const genero of ['rockpop', 'jazzvocal', 'clasica'] as const) {
    assert.ok(CREST_FACTOR_DB[genero] > 0);
  }
});
