import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarReverberacion, COEFICIENTE_ABSORCION, RT60_MIN_OK_S, RT60_MAX_OK_S } from './reverberacion.ts';
import type { Sala } from './sala.ts';

const EPS = 0.005;
const SALA_VECTOR: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // misma sala por defecto que sala.ts/modos.ts

test('vector de sala por defecto (3,6×5,0×2,4), tipo "balanceada": RT60 ≈ 0,450 s → "ok"', () => {
  // V=43,2 m³; S=2·(18)+2·(8,64)+2·(12)=77,28 m²; A=0,20·77,28=15,456 sabines
  // RT60 = 0,161·43,2/15,456 ≈ 0,4500 s
  const r = evaluarReverberacion(SALA_VECTOR, 'balanceada');
  assert.ok(Math.abs(r.volumenM3 - 43.2) < EPS);
  assert.ok(Math.abs(r.superficieTotalM2 - 77.28) < EPS);
  assert.ok(Math.abs(r.absorcionSabines - 15.456) < EPS);
  assert.ok(Math.abs(r.rt60S - 0.45) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'rt60-ok');
});

test('misma sala, tipo "moderna" (poca absorción): RT60 más largo → "warn" (rt60-largo)', () => {
  // A=0,08·77,28=6,1824; RT60=6,9552/6,1824≈1,1250 s
  const r = evaluarReverberacion(SALA_VECTOR, 'moderna');
  assert.ok(Math.abs(r.rt60S - 1.125) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'rt60-largo');
});

test('misma sala, tipo "tratada" (mucha absorción): RT60 más corto → "warn" (rt60-corto)', () => {
  // A=0,35·77,28=27,048; RT60=6,9552/27,048≈0,2572 s
  const r = evaluarReverberacion(SALA_VECTOR, 'tratada');
  assert.ok(Math.abs(r.rt60S - 0.2572) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'rt60-corto');
});

test('frontera de RT60_MIN_OK_S cerrada por abajo: justo encima → "ok", justo debajo → "warn"', () => {
  // Sala cúbica (W=L=H=s): V=s³, S=6s² → RT60 = (0,161/(6·α))·s, lineal en s.
  // Con α=0,20 (balanceada), despejando s para un RT60 objetivo dado: s = RT60·6·α/0,161.
  const alpha = COEFICIENTE_ABSORCION.balanceada;
  const sLado = (rt60Objetivo: number) => (rt60Objetivo * 6 * alpha) / 0.161;

  const rEncima = evaluarReverberacion({ anchoM: sLado(RT60_MIN_OK_S + 0.001), largoM: sLado(RT60_MIN_OK_S + 0.001), altoM: sLado(RT60_MIN_OK_S + 0.001) }, 'balanceada');
  assert.equal(rEncima.severidad, 'ok');
  assert.equal(rEncima.codigo, 'rt60-ok');

  const rDebajo = evaluarReverberacion({ anchoM: sLado(RT60_MIN_OK_S - 0.001), largoM: sLado(RT60_MIN_OK_S - 0.001), altoM: sLado(RT60_MIN_OK_S - 0.001) }, 'balanceada');
  assert.equal(rDebajo.severidad, 'warn');
  assert.equal(rDebajo.codigo, 'rt60-corto');
});

test('severidad nunca es "error" — techo declarado por CLAUDE.md para reglas de sala', () => {
  const salas: Sala[] = [
    { anchoM: 2.5, largoM: 3.0, altoM: 2.2 },
    { anchoM: 3.6, largoM: 5.0, altoM: 2.4 },
    { anchoM: 7, largoM: 9, altoM: 3.5 },
  ];
  const tipos: Array<'moderna' | 'balanceada' | 'tratada'> = ['moderna', 'balanceada', 'tratada'];
  for (const sala of salas) {
    for (const tipo of tipos) {
      const r = evaluarReverberacion(sala, tipo);
      assert.notEqual(r.severidad as string, 'error');
    }
  }
});

test('a mayor absorción declarada (moderna < balanceada < tratada), menor RT60 para la misma sala', () => {
  const rModerna = evaluarReverberacion(SALA_VECTOR, 'moderna');
  const rBalanceada = evaluarReverberacion(SALA_VECTOR, 'balanceada');
  const rTratada = evaluarReverberacion(SALA_VECTOR, 'tratada');
  assert.ok(rModerna.rt60S > rBalanceada.rt60S);
  assert.ok(rBalanceada.rt60S > rTratada.rt60S);
});

test('RT60_MIN_OK_S y RT60_MAX_OK_S están declarados y RT60_MIN < RT60_MAX', () => {
  assert.ok(RT60_MIN_OK_S > 0);
  assert.ok(RT60_MIN_OK_S < RT60_MAX_OK_S);
});
