import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peorConfianza, peorSeveridad } from './tipos.ts';

test('peorConfianza — un solo valor se devuelve igual', () => {
  assert.equal(peorConfianza('alta'), 'alta');
});

test('peorConfianza — alta y media da media', () => {
  assert.equal(peorConfianza('alta', 'media'), 'media');
});

test('peorConfianza — cualquiera con baja da baja', () => {
  assert.equal(peorConfianza('alta', 'media', 'baja'), 'baja');
});

test('peorConfianza — el orden de los argumentos no importa', () => {
  assert.equal(peorConfianza('baja', 'alta'), peorConfianza('alta', 'baja'));
});

test('peorConfianza — sin argumentos tira error en vez de devolver algo arbitrario', () => {
  assert.throws(() => peorConfianza());
});

test('peorSeveridad — alert le gana a warn y a ok', () => {
  assert.equal(peorSeveridad('ok', 'warn', 'alert'), 'alert');
  assert.equal(peorSeveridad('alert', 'ok'), 'alert');
});

test('peorSeveridad — warn le gana a ok si no hay alert', () => {
  assert.equal(peorSeveridad('ok', 'warn'), 'warn');
});

test('peorSeveridad — un solo valor se devuelve igual', () => {
  assert.equal(peorSeveridad('ok'), 'ok');
});

test('peorSeveridad — sin argumentos tira error en vez de devolver algo arbitrario', () => {
  assert.throws(() => peorSeveridad());
});
