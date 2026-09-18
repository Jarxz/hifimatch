import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aMensajePublico, listarMensajesPublicos, LIMITE_MENSAJES_MOSTRADOS } from './mensajes.ts';
import type { MensajeAlmacenado } from './mensajes.ts';

function mensajeAlmacenado(overrides: Partial<MensajeAlmacenado> = {}): MensajeAlmacenado {
  return {
    id: 'id-1',
    nombre: 'Ana',
    email: 'ana@example.com',
    mensaje: 'Gracias por el análisis.',
    creadoEnMs: 1_000_000,
    ...overrides,
  };
}

test('aMensajePublico: el email NUNCA está en las claves del resultado — no sólo "undefined"', () => {
  const almacenado = mensajeAlmacenado();
  const publico = aMensajePublico(almacenado);
  assert.equal('email' in publico, false, 'un spread accidental dejaría "email" como clave con valor undefined; esto detecta esa regresión');
  assert.deepEqual(Object.keys(publico).sort(), ['creadoEnMs', 'id', 'mensaje', 'nombre']);
});

test('aMensajePublico: conserva id/nombre/mensaje/creadoEnMs tal cual', () => {
  const almacenado = mensajeAlmacenado({ id: 'abc', nombre: 'Beto', mensaje: 'Hola', creadoEnMs: 42 });
  assert.deepEqual(aMensajePublico(almacenado), { id: 'abc', nombre: 'Beto', mensaje: 'Hola', creadoEnMs: 42 });
});

test('listarMensajesPublicos: pasa LIMITE_MENSAJES_MOSTRADOS a obtenerMensajes', async () => {
  let limiteRecibido = -1;
  await listarMensajesPublicos({
    obtenerMensajes: async (limite) => {
      limiteRecibido = limite;
      return [];
    },
  });
  assert.equal(limiteRecibido, LIMITE_MENSAJES_MOSTRADOS);
});

test('listarMensajesPublicos: mapea cada mensaje almacenado a su versión pública, ninguno con email', async () => {
  const almacenados = [mensajeAlmacenado({ id: '1' }), mensajeAlmacenado({ id: '2', email: 'otro@example.com' })];
  const publicos = await listarMensajesPublicos({ obtenerMensajes: async () => almacenados });
  assert.equal(publicos.length, 2);
  for (const p of publicos) assert.equal('email' in p, false);
});

test('listarMensajesPublicos: lista vacía da lista vacía, nunca lanza', async () => {
  const publicos = await listarMensajesPublicos({ obtenerMensajes: async () => [] });
  assert.deepEqual(publicos, []);
});
