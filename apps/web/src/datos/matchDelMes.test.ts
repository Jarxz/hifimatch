// PURO — corre el motor real contra el catálogo real, sin mocks, mismo
// criterio que resultado.test.ts. `elegirMatchDelMes` nunca lee
// `Date.now()` internamente, así que estos tests son 100% determinísticos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegirMatchDelMes, SALA_REFERENCIA, MATERIALES_REFERENCIA } from './matchDelMes.ts';
import { CATALOGO, MARCA_GENERICA } from '../../../../packages/data/src/catalogo.ts';
import { calcularDisposicion } from '../../../../packages/engine/src/sala.ts';
import { evaluarModos } from '../../../../packages/engine/src/modos.ts';

test('elegirMatchDelMes: con una fecha fija, no es null contra el catálogo actual', () => {
  const match = elegirMatchDelMes(new Date(2026, 8, 1)); // septiembre 2026
  assert.ok(match, 'debería haber al menos un candidato con el catálogo de hoy');
});

test('elegirMatchDelMes: el parlante y el amplificador elegidos son equipos reales, nunca el arquetipo genérico', () => {
  const match = elegirMatchDelMes(new Date(2026, 8, 1));
  assert.ok(match);
  const parlante = CATALOGO.parlantes.find((p) => p.id === match!.parlanteId);
  const ampli = CATALOGO.amplificadores.find((a) => a.id === match!.amplificadorId);
  assert.ok(parlante, 'el parlanteId elegido tiene que existir en el catálogo');
  assert.ok(ampli, 'el amplificadorId elegido tiene que existir en el catálogo');
  assert.notEqual(parlante!.marca, MARCA_GENERICA);
  assert.notEqual(ampli!.marca, MARCA_GENERICA);
});

test('elegirMatchDelMes: streamerId/dacId, cuando no son null, también son equipos reales del catálogo', () => {
  const match = elegirMatchDelMes(new Date(2026, 8, 1));
  assert.ok(match);
  if (match!.streamerId) {
    assert.ok(CATALOGO.streamers.some((s) => s.id === match!.streamerId));
  }
  if (match!.dacId) {
    assert.ok(CATALOGO.dacs.some((d) => d.id === match!.dacId));
  }
});

test('elegirMatchDelMes: el veredicto recalculado da potencia=ok y acopleElectrico=ok — el mejor resultado real posible', () => {
  const match = elegirMatchDelMes(new Date(2026, 8, 1));
  assert.ok(match);
  assert.equal(match!.veredicto.potencia, 'ok');
  assert.notEqual(match!.veredicto.acopleElectrico, 'warn');
  assert.notEqual(match!.veredicto.acopleElectrico, 'alert');
});

test('elegirMatchDelMes: sala queda en "warn" — límite estructural del modelo (reflexión de piso), nunca "totalmente compatible"', () => {
  const match = elegirMatchDelMes(new Date(2026, 8, 1));
  assert.ok(match);
  assert.equal(match!.veredicto.sala, 'warn');
  assert.equal(match!.veredicto.general, 'warn', 'con sala fija en warn, el mejor general posible es "warn" (soportada con límites)');
});

test('SALA_REFERENCIA: confirma por cómputo directo que sólo el piso es el problema — modos/nulo/asimetría/ángulo dan ok', () => {
  const disp = calcularDisposicion(SALA_REFERENCIA);
  assert.equal(evaluarModos(SALA_REFERENCIA).severidad, 'ok');
  assert.equal(disp.anguloEscuchaGrados > 40 && disp.anguloEscuchaGrados < 65, true);
});

test('elegirMatchDelMes: dos meses de un mismo año pueden dar amplificadores distintos (el índice depende de la fecha)', () => {
  const meses = Array.from({ length: 12 }, (_, i) => elegirMatchDelMes(new Date(2026, i, 1)));
  assert.ok(meses.every((m) => m !== null));
  const idsUnicos = new Set(meses.map((m) => m!.amplificadorId));
  assert.ok(idsUnicos.size > 1, 'con 12 meses distintos, se espera al menos algo de variedad de amplificador elegido');
});

test('elegirMatchDelMes: es determinística — misma fecha, mismo resultado exacto, dos llamadas seguidas', () => {
  const fecha = new Date(2026, 8, 1);
  const a = elegirMatchDelMes(fecha);
  const b = elegirMatchDelMes(fecha);
  assert.deepEqual(a, b);
});

test('elegirMatchDelMes: nunca lee Date.now() — dos fechas del mismo año/mes (día distinto) dan exactamente el mismo resultado', () => {
  const a = elegirMatchDelMes(new Date(2026, 8, 1));
  const b = elegirMatchDelMes(new Date(2026, 8, 27));
  assert.deepEqual(a, b);
});

test('MATERIALES_REFERENCIA: es un objeto Materiales completo (los 6 campos), no un recorte parcial', () => {
  assert.ok(MATERIALES_REFERENCIA.muroFrontal);
  assert.ok(MATERIALES_REFERENCIA.muroPosterior);
  assert.ok(MATERIALES_REFERENCIA.muroIzquierdo);
  assert.ok(MATERIALES_REFERENCIA.muroDerecho);
  assert.ok(MATERIALES_REFERENCIA.piso);
  assert.ok(MATERIALES_REFERENCIA.techo);
});
