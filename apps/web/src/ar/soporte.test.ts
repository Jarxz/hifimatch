import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tieneNavigatorXr, soportaArInmersiva } from './soporte.ts';

test('tieneNavigatorXr: undefined (sin navigator, ej. bajo node --test) → false', () => {
  assert.equal(tieneNavigatorXr(undefined), false);
});

test('tieneNavigatorXr: objeto sin campo xr (ej. Safari/iOS) → false', () => {
  assert.equal(tieneNavigatorXr({}), false);
});

test('tieneNavigatorXr: objeto con campo xr presente → true (sin importar si la sesión terminará soportada)', () => {
  assert.equal(tieneNavigatorXr({ xr: { isSessionSupported: async () => false } }), true);
});

test('soportaArInmersiva: sin navigator.xr → false, sin llamar a nada', () => {
  return soportaArInmersiva(undefined).then((v) => assert.equal(v, false));
});

test('soportaArInmersiva: isSessionSupported resuelve true → true', async () => {
  const v = await soportaArInmersiva({ xr: { isSessionSupported: async () => true } });
  assert.equal(v, true);
});

test('soportaArInmersiva: isSessionSupported resuelve false → false', async () => {
  const v = await soportaArInmersiva({ xr: { isSessionSupported: async () => false } });
  assert.equal(v, false);
});

test('soportaArInmersiva: isSessionSupported rechaza la promesa → false, no tira', async () => {
  const v = await soportaArInmersiva({
    xr: {
      isSessionSupported: async () => {
        throw new Error('no soportado en este navegador');
      },
    },
  });
  assert.equal(v, false);
});
