// PURO — sin DOM ni motor: ordena filas a partir de nombres ya resueltos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filasResumenConfig, requeridosCompletos } from './resumenConfig.ts';
import type { DatosResumenConfig } from './resumenConfig.ts';

const BASE: DatosResumenConfig = {
  spk: null,
  amp: null,
  streamer: null,
  dac: null,
  dimensiones: '3,6 × 5,0 × 2,40 m',
  nivel: 'Alto',
  genero: 'Jazz/Vocal',
};

test('sin nada elegido: parlante y amplificador aparecen como "Por seleccionar" (vacío), streamer y DAC no aparecen', () => {
  const filas = filasResumenConfig(BASE, 'es');
  assert.deepEqual(filas.map((f) => f.clave), ['spk', 'amp', 'sala', 'escucha']);
  assert.equal(filas[0]?.valor, 'Por seleccionar');
  assert.equal(filas[0]?.vacio, true);
  assert.equal(filas[1]?.vacio, true);
});

test('un opcional elegido entra al resumen con su nombre; uno sin elegir no se cuenta como faltante', () => {
  const filas = filasResumenConfig({ ...BASE, spk: 'KEF LS50 Meta', amp: 'Rega Brio', dac: 'Topping E30 II' }, 'es');
  assert.deepEqual(filas.map((f) => f.clave), ['spk', 'amp', 'dac', 'sala', 'escucha']);
  const dac = filas.find((f) => f.clave === 'dac');
  assert.equal(dac?.valor, 'Topping E30 II');
  assert.equal(dac?.vacio, false);
});

test('sala y escucha llevan las dimensiones tal cual y "nivel · género"', () => {
  const filas = filasResumenConfig(BASE, 'es');
  assert.equal(filas.find((f) => f.clave === 'sala')?.valor, '3,6 × 5,0 × 2,40 m');
  assert.equal(filas.find((f) => f.clave === 'escucha')?.valor, 'Alto · Jazz/Vocal');
});

test('en inglés: etiquetas y "Por seleccionar" en inglés, sin mezclar idiomas', () => {
  const filas = filasResumenConfig({ ...BASE, dimensiones: '3.6 × 5.0 × 2.40 m', nivel: 'High', genero: 'Jazz/Vocal' }, 'en');
  assert.equal(filas[0]?.etiqueta, 'Speakers');
  assert.equal(filas[0]?.valor, 'To be selected');
  assert.equal(filas.find((f) => f.clave === 'sala')?.etiqueta, 'Room');
  assert.equal(filas.find((f) => f.clave === 'escucha')?.etiqueta, 'Listening');
});

test('requeridosCompletos: sólo con parlante Y amplificador', () => {
  assert.equal(requeridosCompletos({ spk: null, amp: null }), false);
  assert.equal(requeridosCompletos({ spk: 'a', amp: null }), false);
  assert.equal(requeridosCompletos({ spk: null, amp: 'b' }), false);
  assert.equal(requeridosCompletos({ spk: 'a', amp: 'b' }), true);
});
