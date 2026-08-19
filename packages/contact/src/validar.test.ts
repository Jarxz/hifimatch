import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarContacto, TIEMPO_MINIMO_MS, LARGO_MAXIMO_MENSAJE } from './validar.ts';
import type { EntradaContacto } from './validar.ts';

function entradaValida(overrides: Partial<EntradaContacto> = {}): EntradaContacto {
  const cargadoEnMs = 1_000_000;
  return {
    nombre: 'Ana',
    email: 'ana@example.com',
    mensaje: 'Hola, tengo una pregunta sobre el catálogo.',
    honeypot: '',
    cargadoEnMs,
    enviadoEnMs: cargadoEnMs + TIEMPO_MINIMO_MS + 500,
    ...overrides,
  };
}

test('entrada válida → ok', () => {
  assert.deepEqual(validarContacto(entradaValida()), { ok: true });
});

test('honeypot no vacío → "honeypot", antes que cualquier otro chequeo', () => {
  // email inválido Y honeypot lleno a la vez: gana honeypot (se corta primero, más barato).
  const r = validarContacto(entradaValida({ honeypot: 'asunto', email: 'no-es-un-email' }));
  assert.deepEqual(r, { ok: false, codigo: 'honeypot' });
});

test('menos del tiempo mínimo entre cargar y enviar → "muy-rapido"', () => {
  const cargadoEnMs = 1_000_000;
  const r = validarContacto(entradaValida({ cargadoEnMs, enviadoEnMs: cargadoEnMs + TIEMPO_MINIMO_MS - 1 }));
  assert.deepEqual(r, { ok: false, codigo: 'muy-rapido' });
});

test('exactamente el tiempo mínimo → ok (el umbral no rechaza el borde)', () => {
  const cargadoEnMs = 1_000_000;
  const r = validarContacto(entradaValida({ cargadoEnMs, enviadoEnMs: cargadoEnMs + TIEMPO_MINIMO_MS }));
  assert.deepEqual(r, { ok: true });
});

test('email sin formato válido → "email-invalido"', () => {
  for (const email of ['no-es-un-email', 'falta-arroba.com', 'sin-dominio@', '@sin-usuario.com', '']) {
    assert.deepEqual(validarContacto(entradaValida({ email })), { ok: false, codigo: 'email-invalido' }, email);
  }
});

test('mensaje vacío o sólo espacios → "mensaje-vacio"', () => {
  assert.deepEqual(validarContacto(entradaValida({ mensaje: '' })), { ok: false, codigo: 'mensaje-vacio' });
  assert.deepEqual(validarContacto(entradaValida({ mensaje: '   ' })), { ok: false, codigo: 'mensaje-vacio' });
});

test('mensaje que excede el largo máximo → "mensaje-largo"', () => {
  const r = validarContacto(entradaValida({ mensaje: 'a'.repeat(LARGO_MAXIMO_MENSAJE + 1) }));
  assert.deepEqual(r, { ok: false, codigo: 'mensaje-largo' });
});

test('mensaje exactamente en el largo máximo → ok (el tope no rechaza el borde)', () => {
  const r = validarContacto(entradaValida({ mensaje: 'a'.repeat(LARGO_MAXIMO_MENSAJE) }));
  assert.deepEqual(r, { ok: true });
});

test('nombre vacío no es motivo de rechazo — es opcional', () => {
  assert.deepEqual(validarContacto(entradaValida({ nombre: '' })), { ok: true });
});
