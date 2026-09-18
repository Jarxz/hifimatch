import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarMensaje, TIEMPO_MINIMO_MS, LARGO_MAXIMO_MENSAJE } from './mensajes.ts';
import type { EntradaMensaje } from './mensajes.ts';

function entradaValida(overrides: Partial<EntradaMensaje> = {}): EntradaMensaje {
  const cargadoEnMs = 1_000_000;
  return {
    nombre: 'Ana',
    email: 'ana@example.com',
    mensaje: 'Gracias por el análisis, muy útil.',
    honeypot: '',
    cargadoEnMs,
    enviadoEnMs: cargadoEnMs + TIEMPO_MINIMO_MS + 500,
    ...overrides,
  };
}

test('entrada válida → ok', () => {
  assert.deepEqual(validarMensaje(entradaValida()), { ok: true });
});

test('honeypot no vacío → "honeypot", antes que cualquier otro chequeo', () => {
  const r = validarMensaje(entradaValida({ honeypot: 'asunto', email: 'no-es-un-email' }));
  assert.deepEqual(r, { ok: false, codigo: 'honeypot' });
});

test('menos del tiempo mínimo entre cargar y enviar → "muy-rapido"', () => {
  const cargadoEnMs = 1_000_000;
  const r = validarMensaje(entradaValida({ cargadoEnMs, enviadoEnMs: cargadoEnMs + TIEMPO_MINIMO_MS - 1 }));
  assert.deepEqual(r, { ok: false, codigo: 'muy-rapido' });
});

test('exactamente el tiempo mínimo → ok (el umbral no rechaza el borde)', () => {
  const cargadoEnMs = 1_000_000;
  const r = validarMensaje(entradaValida({ cargadoEnMs, enviadoEnMs: cargadoEnMs + TIEMPO_MINIMO_MS }));
  assert.deepEqual(r, { ok: true });
});

test('email sin formato válido → "email-invalido"', () => {
  for (const email of ['no-es-un-email', 'falta-arroba.com', 'sin-dominio@', '@sin-usuario.com', '']) {
    assert.deepEqual(validarMensaje(entradaValida({ email })), { ok: false, codigo: 'email-invalido' }, email);
  }
});

test('mensaje vacío o sólo espacios → "mensaje-vacio"', () => {
  assert.deepEqual(validarMensaje(entradaValida({ mensaje: '' })), { ok: false, codigo: 'mensaje-vacio' });
  assert.deepEqual(validarMensaje(entradaValida({ mensaje: '   ' })), { ok: false, codigo: 'mensaje-vacio' });
});

test('mensaje que excede el largo máximo → "mensaje-largo"', () => {
  const r = validarMensaje(entradaValida({ mensaje: 'a'.repeat(LARGO_MAXIMO_MENSAJE + 1) }));
  assert.deepEqual(r, { ok: false, codigo: 'mensaje-largo' });
});

test('mensaje exactamente en el largo máximo → ok (el tope no rechaza el borde)', () => {
  const r = validarMensaje(entradaValida({ mensaje: 'a'.repeat(LARGO_MAXIMO_MENSAJE) }));
  assert.deepEqual(r, { ok: true });
});

test('nombre vacío no es motivo de rechazo — es opcional', () => {
  assert.deepEqual(validarMensaje(entradaValida({ nombre: '' })), { ok: true });
});
