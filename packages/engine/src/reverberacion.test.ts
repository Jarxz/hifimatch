import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarReverberacion, ABSORCION_MURO, ABSORCION_PISO, ABSORCION_TECHO, RT60_MIN_OK_S, RT60_MAX_OK_S } from './reverberacion.ts';
import type { Sala } from './sala.ts';
import type { Materiales } from './reverberacion.ts';

const EPS = 0.005;
const SALA_VECTOR: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // misma sala por defecto que sala.ts/modos.ts

const TIPICOS: Materiales = {
  muroFrontal: 'yesoCarton',
  muroPosterior: 'yesoCarton',
  muroIzquierdo: 'yesoCarton',
  muroDerecho: 'yesoCarton',
  piso: 'maderaLaminado',
  techo: 'yesoCarton',
};

test('vector de sala por defecto, los 4 muros yeso cartón + piso madera laminado + techo yeso cartón → "warn" (rt60-largo)', () => {
  // S_frontal=S_posterior=3,6×2,4=8,64 m²; S_izq=S_der=5,0×2,4=12,00 m²; S_piso=S_techo=18,00 m²
  // A = 0,08·(8,64·2+12·2) + 0,05·18 + 0,06·18 = 0,08·41,28+0,9+1,08 = 5,2824 sabines
  // RT60 = 0,161·43,2/5,2824 ≈ 1,3167 s — mismo total que el modelo de un solo "muro" (todas las
  // superficies con el mismo α dan la misma absorción total, decompuestas o no)
  const r = evaluarReverberacion(SALA_VECTOR, TIPICOS);
  assert.ok(Math.abs(r.volumenM3 - 43.2) < EPS);
  assert.ok(Math.abs(r.superficieFrontalM2 - 8.64) < EPS);
  assert.ok(Math.abs(r.superficieIzquierdaM2 - 12) < EPS);
  assert.ok(Math.abs(r.absorcionTotalSabines - 5.2824) < EPS);
  assert.ok(Math.abs(r.rt60S - 1.3167) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'rt60-largo');
});

test('muro frontal "vacío" (abertura/pasillo): absorbe como ventana abierta (α=1,0) y baja el RT60 a rango cómodo', () => {
  // A = 1,0·8,64 (frontal, vacío) + 0,08·8,64 (posterior) + 0,08·24 (izq+der) + 0,05·18 + 0,06·18
  //   = 8,64+0,6912+1,92+0,9+1,08 = 13,2312 sabines
  // RT60 = 6,9552/13,2312 ≈ 0,5257 s → dentro de 0,3–0,6 → "ok"
  const materiales: Materiales = { ...TIPICOS, muroFrontal: 'vacio' };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  assert.equal(ABSORCION_MURO.vacio, 1.0);
  assert.ok(Math.abs(r.absorcionTotalSabines - 13.2312) < EPS, `A=${r.absorcionTotalSabines}`);
  assert.ok(Math.abs(r.rt60S - 0.5257) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'rt60-ok');
});

test('sala muy tratada (panel acústico en frontal/posterior/techo, madera en laterales, alfombra en piso) → "warn" (rt60-corto)', () => {
  // A = 0,75·17,28 (frontal+posterior) + 0,11·24 (izq+der) + 0,28·18 (piso) + 0,75·18 (techo)
  //   = 12,96+2,64+5,04+13,5 = 34,14 sabines
  // RT60 = 6,9552/34,14 ≈ 0,2037 s
  const materiales: Materiales = {
    muroFrontal: 'panelAcustico',
    muroPosterior: 'panelAcustico',
    muroIzquierdo: 'madera',
    muroDerecho: 'madera',
    piso: 'alfombra',
    techo: 'panelAcustico',
  };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  assert.ok(Math.abs(r.rt60S - 0.2037) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'rt60-corto');
});

test('los 4 muros son independientes: cambiar sólo uno cambia el resultado, los otros tres no fuerzan el mismo material', () => {
  const base = evaluarReverberacion(SALA_VECTOR, TIPICOS);
  const conVidrioFrontal = evaluarReverberacion(SALA_VECTOR, { ...TIPICOS, muroFrontal: 'vidrio' });
  assert.notEqual(base.absorcionTotalSabines, conVidrioFrontal.absorcionTotalSabines);
  assert.ok(Math.abs(conVidrioFrontal.absorcionPosteriorSabines - base.absorcionPosteriorSabines) < EPS);
  assert.ok(Math.abs(conVidrioFrontal.absorcionIzquierdaSabines - base.absorcionIzquierdaSabines) < EPS);
  assert.ok(Math.abs(conVidrioFrontal.absorcionDerechaSabines - base.absorcionDerechaSabines) < EPS);
});

test('absorción total es la suma de las 6 superficies, no un promedio ni un coeficiente único', () => {
  const materiales: Materiales = {
    muroFrontal: 'vidrio',
    muroPosterior: 'hormigon',
    muroIzquierdo: 'madera',
    muroDerecho: 'yesoCarton',
    piso: 'porcelanato',
    techo: 'hormigon',
  };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  const esperado =
    ABSORCION_MURO.vidrio * r.superficieFrontalM2 +
    ABSORCION_MURO.hormigon * r.superficiePosteriorM2 +
    ABSORCION_MURO.madera * r.superficieIzquierdaM2 +
    ABSORCION_MURO.yesoCarton * r.superficieDerechaM2 +
    ABSORCION_PISO.porcelanato * r.superficiePisoM2 +
    ABSORCION_TECHO.hormigon * r.superficieTechoM2;
  assert.ok(Math.abs(r.absorcionTotalSabines - esperado) < 1e-9);
});

test('frontera de RT60_MIN_OK_S cerrada por abajo: justo encima → "ok", justo debajo → "warn" (los 6 superficies con mismo α: hormigón)', () => {
  // Sala cúbica (W=L=H=s) con las 6 superficies en hormigón, mismo α=0,02 en las tres tablas:
  // S_total=6s², A=0,02·6s², RT60=(0,161/(6·0,02))·s, lineal en s → s = RT60·6·0,02/0,161.
  const alpha = ABSORCION_MURO.hormigon;
  assert.equal(alpha, ABSORCION_PISO.hormigon);
  assert.equal(alpha, ABSORCION_TECHO.hormigon);
  const materiales: Materiales = {
    muroFrontal: 'hormigon',
    muroPosterior: 'hormigon',
    muroIzquierdo: 'hormigon',
    muroDerecho: 'hormigon',
    piso: 'hormigon',
    techo: 'hormigon',
  };
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
    TIPICOS,
    { ...TIPICOS, muroFrontal: 'vacio', muroPosterior: 'vacio' },
    { muroFrontal: 'vacio', muroPosterior: 'vacio', muroIzquierdo: 'vacio', muroDerecho: 'vacio', piso: 'alfombra', techo: 'panelAcustico' },
    { muroFrontal: 'panelAcustico', muroPosterior: 'panelAcustico', muroIzquierdo: 'panelAcustico', muroDerecho: 'panelAcustico', piso: 'alfombra', techo: 'panelAcustico' },
  ];
  for (const sala of salas) {
    for (const materiales of combos) {
      const r = evaluarReverberacion(sala, materiales);
      assert.notEqual(r.severidad as string, 'error');
    }
  }
});

test('RT60_MIN_OK_S y RT60_MAX_OK_S están declarados y RT60_MIN < RT60_MAX', () => {
  assert.ok(RT60_MIN_OK_S > 0);
  assert.ok(RT60_MIN_OK_S < RT60_MAX_OK_S);
});
