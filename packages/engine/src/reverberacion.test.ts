import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarReverberacion, ABSORCION_MURO, ABSORCION_PISO, ABSORCION_TECHO, RT60_MIN_OK_S, RT60_MAX_OK_S } from './reverberacion.ts';
import type { Sala } from './sala.ts';
import type { Materiales } from './reverberacion.ts';

const EPS = 0.005;
const SALA_VECTOR: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // misma sala por defecto que sala.ts/modos.ts

test('vector de sala por defecto: muro yeso cartón + piso madera laminado + techo yeso cartón → "warn" (rt60-largo)', () => {
  // S_muros=2·(3,6×2,4)+2·(5,0×2,4)=41,28 m²; S_piso=S_techo=18,00 m²
  // A = 0,08·41,28 + 0,05·18 + 0,06·18 = 3,3024+0,9+1,08 = 5,2824 sabines
  // RT60 = 0,161·43,2/5,2824 ≈ 1,3167 s
  const materiales: Materiales = { muro: 'yesoCarton', piso: 'maderaLaminado', techo: 'yesoCarton' };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  assert.ok(Math.abs(r.volumenM3 - 43.2) < EPS);
  assert.ok(Math.abs(r.superficieMurosM2 - 41.28) < EPS);
  assert.ok(Math.abs(r.superficiePisoM2 - 18) < EPS);
  assert.ok(Math.abs(r.superficieTechoM2 - 18) < EPS);
  assert.ok(Math.abs(r.absorcionTotalSabines - 5.2824) < EPS);
  assert.ok(Math.abs(r.rt60S - 1.3167) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'rt60-largo');
});

test('sala muy tratada (panel acústico en muro y techo, alfombra en piso) → "warn" (rt60-corto, demasiado seca)', () => {
  // A = 0,75·41,28 + 0,28·18 + 0,75·18 = 30,96+5,04+13,5 = 49,5 sabines
  // RT60 = 6,9552/49,5 ≈ 0,1405 s
  const materiales: Materiales = { muro: 'panelAcustico', piso: 'alfombra', techo: 'panelAcustico' };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  assert.ok(Math.abs(r.rt60S - 0.1405) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'rt60-corto');
});

test('combinación intermedia (muro madera, piso alfombra, techo panel acústico) → "ok", dentro del rango cómodo', () => {
  // A = 0,11·41,28 + 0,28·18 + 0,75·18 = 4,5408+5,04+13,5 = 23,0808 sabines
  // RT60 = 6,9552/23,0808 ≈ 0,3013 s
  const materiales: Materiales = { muro: 'madera', piso: 'alfombra', techo: 'panelAcustico' };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  assert.ok(Math.abs(r.rt60S - 0.3013) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'rt60-ok');
});

test('absorción total es la suma de las tres superficies, no un promedio ni un coeficiente único', () => {
  const materiales: Materiales = { muro: 'vidrio', piso: 'porcelanato', techo: 'hormigon' };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  const esperado =
    ABSORCION_MURO.vidrio * r.superficieMurosM2 + ABSORCION_PISO.porcelanato * r.superficiePisoM2 + ABSORCION_TECHO.hormigon * r.superficieTechoM2;
  assert.ok(Math.abs(r.absorcionTotalSabines - esperado) < 1e-9);
  assert.ok(Math.abs(r.absorcionMurosSabines + r.absorcionPisoSabines + r.absorcionTechoSabines - r.absorcionTotalSabines) < 1e-9);
});

test('frontera de RT60_MIN_OK_S cerrada por abajo: justo encima → "ok", justo debajo → "warn" (los 3 materiales con mismo α: hormigón)', () => {
  // Sala cúbica (W=L=H=s) con muro/piso/techo=hormigón, mismo α=0,02 en las tres tablas:
  // S_total=6s², A=0,02·6s², RT60=(0,161/(6·0,02))·s, lineal en s → s = RT60·6·0,02/0,161.
  const alpha = ABSORCION_MURO.hormigon;
  assert.equal(alpha, ABSORCION_PISO.hormigon);
  assert.equal(alpha, ABSORCION_TECHO.hormigon);
  const materiales: Materiales = { muro: 'hormigon', piso: 'hormigon', techo: 'hormigon' };
  const sLado = (rt60Objetivo: number) => (rt60Objetivo * 6 * alpha) / 0.161;

  const sEncima = sLado(RT60_MIN_OK_S + 0.001);
  const rEncima = evaluarReverberacion({ anchoM: sEncima, largoM: sEncima, altoM: sEncima }, materiales);
  assert.equal(rEncima.severidad, 'ok');
  assert.equal(rEncima.codigo, 'rt60-ok');

  const sDebajo = sLado(RT60_MIN_OK_S - 0.001);
  const rDebajo = evaluarReverberacion({ anchoM: sDebajo, largoM: sDebajo, altoM: sDebajo }, materiales);
  assert.equal(rDebajo.severidad, 'warn');
  assert.equal(rDebajo.codigo, 'rt60-corto');
});

test('severidad nunca es "error" — techo declarado por CLAUDE.md para reglas de sala', () => {
  const salas: Sala[] = [
    { anchoM: 2.5, largoM: 3.0, altoM: 2.2 },
    { anchoM: 3.6, largoM: 5.0, altoM: 2.4 },
    { anchoM: 7, largoM: 9, altoM: 3.5 },
  ];
  const combos: Materiales[] = [
    { muro: 'hormigon', piso: 'hormigon', techo: 'hormigon' },
    { muro: 'vidrio', piso: 'porcelanato', techo: 'hormigon' },
    { muro: 'madera', piso: 'maderaLaminado', techo: 'madera' },
    { muro: 'yesoCarton', piso: 'alfombra', techo: 'yesoCarton' },
    { muro: 'panelAcustico', piso: 'alfombra', techo: 'panelAcustico' },
  ];
  for (const sala of salas) {
    for (const materiales of combos) {
      const r = evaluarReverberacion(sala, materiales);
      assert.notEqual(r.severidad as string, 'error');
    }
  }
});

test('a mayor absorción del material elegido, menor RT60 para la misma sala y la misma superficie', () => {
  const base: Materiales = { muro: 'hormigon', piso: 'hormigon', techo: 'hormigon' };
  const rBase = evaluarReverberacion(SALA_VECTOR, base);
  const rMuroMadera = evaluarReverberacion(SALA_VECTOR, { ...base, muro: 'madera' });
  const rMuroPanel = evaluarReverberacion(SALA_VECTOR, { ...base, muro: 'panelAcustico' });
  assert.ok(rBase.rt60S > rMuroMadera.rt60S);
  assert.ok(rMuroMadera.rt60S > rMuroPanel.rt60S);

  const rPisoAlfombra = evaluarReverberacion(SALA_VECTOR, { ...base, piso: 'alfombra' });
  assert.ok(rBase.rt60S > rPisoAlfombra.rt60S);
});

test('RT60_MIN_OK_S y RT60_MAX_OK_S están declarados y RT60_MIN < RT60_MAX', () => {
  assert.ok(RT60_MIN_OK_S > 0);
  assert.ok(RT60_MIN_OK_S < RT60_MAX_OK_S);
});
