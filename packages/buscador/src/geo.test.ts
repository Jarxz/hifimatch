import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paisRestringido } from './geo.ts';

test('paisRestringido: Chile (donde vive el usuario) NO está restringido', () => {
  assert.equal(paisRestringido('CL'), false);
});
test('paisRestringido: Estados Unidos no está restringido', () => {
  assert.equal(paisRestringido('US'), false);
});
test('paisRestringido: Reino Unido SÍ (nombrado explícito en la cláusula)', () => {
  assert.equal(paisRestringido('GB'), true);
});
test('paisRestringido: Suiza SÍ (nombrada explícito, no es UE ni EEE)', () => {
  assert.equal(paisRestringido('CH'), true);
});
test('paisRestringido: Alemania SÍ (Unión Europea, dentro del EEE)', () => {
  assert.equal(paisRestringido('DE'), true);
});
test('paisRestringido: Noruega SÍ (EEE, no es UE)', () => {
  assert.equal(paisRestringido('NO'), true);
});
test('paisRestringido: minúsculas y espacios no rompen la comparación', () => {
  assert.equal(paisRestringido('  de '), true);
  assert.equal(paisRestringido('cl'), false);
});
test('paisRestringido: null/undefined/vacío se tratan como restringidos (lectura conservadora)', () => {
  assert.equal(paisRestringido(null), true);
  assert.equal(paisRestringido(undefined), true);
  assert.equal(paisRestringido(''), true);
});
test('paisRestringido: un valor que no es un código de 2 letras se trata como restringido', () => {
  assert.equal(paisRestringido('unknown'), true);
  assert.equal(paisRestringido('X'), true);
});
test('paisRestringido: el EEE completo (27 UE + IS/LI/NO) más CH/GB da exactamente 32 códigos', () => {
  const RESTRINGIDOS = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    'IS', 'LI', 'NO', 'CH', 'GB',
  ];
  assert.equal(RESTRINGIDOS.length, 32);
  for (const codigo of RESTRINGIDOS) assert.equal(paisRestringido(codigo), true, codigo);
});
test('paisRestringido: Latinoamérica entera no está restringida', () => {
  for (const codigo of ['CL', 'AR', 'BR', 'PE', 'CO', 'MX', 'UY']) {
    assert.equal(paisRestringido(codigo), false, codigo);
  }
});
