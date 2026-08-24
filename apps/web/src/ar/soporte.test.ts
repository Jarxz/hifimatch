import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tieneNavigatorXr, soportaArInmersiva, esUserAgentIOS } from './soporte.ts';

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

test('esUserAgentIOS: iPhone/iPad/iPod → true', () => {
  assert.equal(esUserAgentIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'), true);
  assert.equal(esUserAgentIOS('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15'), true);
  assert.equal(esUserAgentIOS('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'), true);
});

test('esUserAgentIOS: Android, desktop y Mac (Safari de escritorio no tiene Quick Look) → false', () => {
  assert.equal(esUserAgentIOS('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0'), false);
  assert.equal(esUserAgentIOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0'), false);
  assert.equal(esUserAgentIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'), false);
});
