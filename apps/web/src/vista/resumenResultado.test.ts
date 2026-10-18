// PURO — sin DOM. La banda de Resultado sólo re-muestra números que el motor
// ya calculó; estas pruebas fijan formato por idioma, el rango declarado y
// que nada se inventa cuando falta un dato.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modeloBandaResultado, primerModoAxialHz } from './resumenResultado.ts';
import type { DatosBandaResultado } from './resumenResultado.ts';

const BASE: DatosBandaResultado = {
  spkNombre: 'KEF LS50 Meta',
  ampNombre: 'Rega Brio',
  streamerNombre: null,
  dacNombre: null,
  anchoM: 3.6,
  largoM: 5,
  altoM: 2.4,
  nivelTexto: 'Alto',
  picoObjetivoDb: 100,
  distanciaEscuchaM: 2.6,
  splDisponibleDb: 94.3,
  splDisponibleRangoDb: null,
  margenDb: -5.7,
  margenRangoDb: null,
  primerModoHz: 34.3,
  confianzaMasBaja: 'alta',
};

test('filas: cadena con "+", espacio con separador decimal por idioma, escucha con el pico y confianza traducida', () => {
  const es = modeloBandaResultado({ ...BASE, streamerNombre: 'WiiM Pro Plus', dacNombre: 'Topping E30 II' }, 'es').filas;
  assert.deepEqual(es.map((f) => f.clave), ['cadena', 'espacio', 'escucha', 'confianza']);
  assert.equal(es[0]?.valor, 'KEF LS50 Meta + Rega Brio + WiiM Pro Plus + Topping E30 II');
  assert.equal(es[1]?.valor, '3,6 × 5,0 × 2,40 m');
  assert.equal(es[2]?.valor, 'Alto · 100 dB');
  assert.equal(es[3]?.valor, 'Alta');
  const en = modeloBandaResultado({ ...BASE, confianzaMasBaja: 'baja' }, 'en').filas;
  assert.equal(en[1]?.valor, '3.6 × 5.0 × 2.40 m');
  assert.equal(en[3]?.valor, 'Low');
});

test('métricas: nivel, margen con signo explícito y primer modo; unidades dB / dB / Hz', () => {
  const m = modeloBandaResultado(BASE, 'es').metricas;
  assert.deepEqual(m.map((x) => x.clave), ['nivel', 'margen', 'modo']);
  assert.equal(m[0]?.valor, '94,3');
  assert.equal(m[1]?.valor, '−5,7');
  assert.equal(m[2]?.valor, '34,3');
  assert.deepEqual(m.map((x) => x.unidad), ['dB', 'dB', 'Hz']);
  assert.match(m[0]!.texto, /2,6 m/);
  assert.match(m[1]!.texto, /100 dB/);
});

test('sin rango de sensibilidad no se declara ninguno; con rango se declara junto a la cifra', () => {
  assert.equal(modeloBandaResultado(BASE, 'es').metricas[1]?.rango, null);
  const conRango = modeloBandaResultado(
    { ...BASE, splDisponibleRangoDb: [94.3, 97.3], margenRangoDb: [-5.7, -2.7] },
    'es'
  ).metricas;
  assert.match(conRango[0]!.rango!, /94,3 a 97,3 dB/);
  assert.match(conRango[1]!.rango!, /−5,7 a −2,7 dB/);
  assert.match(conRango[0]!.rango!, /convención/);
  assert.equal(conRango[2]?.rango, null);
});

test('sin modo axial listado no se inventa la cifra: sólo quedan nivel y margen', () => {
  const m = modeloBandaResultado({ ...BASE, primerModoHz: null }, 'es').metricas;
  assert.deepEqual(m.map((x) => x.clave), ['nivel', 'margen']);
});

test('primerModoAxialHz: el más bajo de los listados; lista vacía → null', () => {
  assert.equal(primerModoAxialHz([{ frecuenciaHz: 68.6 }, { frecuenciaHz: 34.3 }, { frecuenciaHz: 47.6 }]), 34.3);
  assert.equal(primerModoAxialHz([]), null);
});
