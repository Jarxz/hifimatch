import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codificarEstadoAr, decodificarEstadoAr } from './estadoUrl.ts';
import type { EstadoAr } from './estadoUrl.ts';

const ESTADO: EstadoAr = {
  sala: { anchoM: 3.6, largoM: 5.0, altoM: 2.4 },
  parlanteIzq: { x: 1.075, y: 0.75 },
  parlanteDer: { x: 2.525, y: 0.75 },
  asiento: { x: 1.8, y: 3.126 },
  muroFrontalVacio: false,
  muroPosteriorVacio: true,
  muroIzquierdoVacio: false,
  muroDerechoVacio: false,
};

test('round-trip: codificar → decodificar reproduce el estado original dentro de tolerancia de punto flotante', () => {
  const qs = codificarEstadoAr(ESTADO);
  const decodificado = decodificarEstadoAr(qs);
  assert.ok(decodificado !== null);
  assert.ok(Math.abs(decodificado.sala.anchoM - ESTADO.sala.anchoM) < 1e-6);
  assert.ok(Math.abs(decodificado.sala.largoM - ESTADO.sala.largoM) < 1e-6);
  assert.ok(Math.abs(decodificado.sala.altoM - ESTADO.sala.altoM) < 1e-6);
  assert.ok(Math.abs(decodificado.parlanteIzq.x - ESTADO.parlanteIzq.x) < 1e-6);
  assert.ok(Math.abs(decodificado.parlanteIzq.y - ESTADO.parlanteIzq.y) < 1e-6);
  assert.ok(Math.abs(decodificado.parlanteDer.x - ESTADO.parlanteDer.x) < 1e-6);
  assert.ok(Math.abs(decodificado.asiento.x - ESTADO.asiento.x) < 1e-6);
  assert.ok(Math.abs(decodificado.asiento.y - ESTADO.asiento.y) < 1e-6);
  assert.equal(decodificado.muroFrontalVacio, false);
  assert.equal(decodificado.muroPosteriorVacio, true);
  assert.equal(decodificado.muroIzquierdoVacio, false);
  assert.equal(decodificado.muroDerechoVacio, false);
});

test('round-trip: banderas de muro vacío en todas las combinaciones sobreviven', () => {
  const estado: EstadoAr = { ...ESTADO, muroFrontalVacio: true, muroPosteriorVacio: false, muroIzquierdoVacio: true, muroDerechoVacio: true };
  const decodificado = decodificarEstadoAr(codificarEstadoAr(estado));
  assert.deepEqual(
    { f: decodificado?.muroFrontalVacio, p: decodificado?.muroPosteriorVacio, i: decodificado?.muroIzquierdoVacio, d: decodificado?.muroDerechoVacio },
    { f: true, p: false, i: true, d: true }
  );
});

test('decodificarEstadoAr: query string vacía → null', () => {
  assert.equal(decodificarEstadoAr(''), null);
});

test('decodificarEstadoAr: falta un campo requerido (siy) → null', () => {
  const qs = codificarEstadoAr(ESTADO);
  const p = new URLSearchParams(qs);
  p.delete('siy');
  assert.equal(decodificarEstadoAr(p.toString()), null);
});

test('decodificarEstadoAr: W no numérico ("abc") → null', () => {
  const qs = codificarEstadoAr(ESTADO);
  const p = new URLSearchParams(qs);
  p.set('W', 'abc');
  assert.equal(decodificarEstadoAr(p.toString()), null);
});

test('decodificarEstadoAr: W negativo → null', () => {
  const qs = codificarEstadoAr(ESTADO);
  const p = new URLSearchParams(qs);
  p.set('W', '-1');
  assert.equal(decodificarEstadoAr(p.toString()), null);
});

test('decodificarEstadoAr: W absurdamente grande (fuera de la cota de sanidad) → null', () => {
  const qs = codificarEstadoAr(ESTADO);
  const p = new URLSearchParams(qs);
  p.set('W', '99999');
  assert.equal(decodificarEstadoAr(p.toString()), null);
});

test('decodificarEstadoAr: banderas de muro ausentes se leen como false (no rompe la decodificación)', () => {
  const qs = codificarEstadoAr(ESTADO);
  const p = new URLSearchParams(qs);
  p.delete('mf');
  const decodificado = decodificarEstadoAr(p.toString());
  assert.equal(decodificado?.muroFrontalVacio, false);
});
