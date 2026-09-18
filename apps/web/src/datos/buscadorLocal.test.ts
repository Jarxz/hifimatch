import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarLocal, marcasDe, equiposDeMarca } from './buscadorLocal.ts';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';

test('marcasDe: marcas únicas, alfabéticas, sin duplicados — para el <select> del modo "Catálogo"', () => {
  const marcas = marcasDe('spk');
  assert.equal(new Set(marcas).size, marcas.length, 'no debe haber duplicados');
  const copia = [...marcas].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(marcas, copia, 'debe venir ya ordenada alfabéticamente');
  assert.ok(marcas.includes('KEF'), JSON.stringify(marcas));
});

test('equiposDeMarca: sólo equipos de esa marca exacta, ordenados por nombre', () => {
  const equipos = equiposDeMarca('spk', 'KEF');
  assert.ok(equipos.length > 0);
  assert.ok(equipos.every((e) => e.marca === 'KEF'));
  const nombres = equipos.map((e) => e.nombre);
  assert.deepEqual(nombres, [...nombres].sort((a, b) => a.localeCompare(b)));
});

test('equiposDeMarca: marca inexistente devuelve vacío, nunca todo el catálogo', () => {
  assert.deepEqual(equiposDeMarca('spk', 'MarcaQueNoExiste'), []);
});

test('buscarLocal: "KEF" + "LS50" encuentra el KEF LS50 Meta real del catálogo', () => {
  const r = buscarLocal('spk', 'KEF', 'LS50');
  assert.ok(r.some((eq) => eq.id === 'kef-ls50-meta'), JSON.stringify(r.map((e) => e.id)));
});

test('buscarLocal: "Wharfdale" (sin la "e", error de tipeo real) SÍ encuentra Wharfedale — el motivo original de agregar búsqueda difusa', () => {
  const r = buscarLocal('spk', 'Wharfdale', 'Linton');
  assert.ok(r.some((eq) => eq.marca === 'Wharfedale'), JSON.stringify(r.map((e) => e.marca)));
});

test('buscarLocal: "generico" sin acento encuentra "Genérico (Arquetipo)" — normalización de diacríticos', () => {
  const r = buscarLocal('spk', 'generico', '');
  assert.ok(r.length > 0);
  assert.ok(r.some((eq) => eq.marca.toLowerCase().includes('gen')), JSON.stringify(r.map((e) => e.marca)));
});

test('buscarLocal: marca + modelo juntos filtran más que sólo la marca', () => {
  const soloMarca = buscarLocal('amp', 'Cambridge Audio', '');
  const marcaYModelo = buscarLocal('amp', 'Cambridge Audio', 'CXA81');
  assert.ok(marcaYModelo.length <= soloMarca.length);
  assert.ok(marcaYModelo.some((eq) => eq.id === 'cambridge-cxa81'));
});

test('buscarLocal: una consulta sin sentido devuelve vacío, nunca un resultado forzado', () => {
  const r = buscarLocal('spk', 'xxxxzzzzqqqqnoexiste', 'nadaquevercompletamente');
  assert.deepEqual(r, []);
});

test('buscarLocal: bug real encontrado en vivo — "WiiM"+"Ultra" (modelo que NO existe en el catálogo) ya NO devuelve "WiiM Pro Plus" (mismo fabricante, modelo completamente distinto). Antes de este fix, coincidir sólo en la marca bastaba para Fuse.js y la búsqueda web nunca se intentaba.', () => {
  const r = buscarLocal('streamer', 'WiiM', 'Ultra');
  assert.deepEqual(r, [], 'un modelo inexistente de una marca SÍ catalogada debe caer a la búsqueda web, no mostrar un modelo distinto');
});

test('buscarLocal: "Sonos"+"Move" no matchea "Sonus Faber" por parecido superficial del nombre de marca', () => {
  const r = buscarLocal('spk', 'Sonos', 'Move');
  assert.deepEqual(r, []);
});

test('buscarLocal: el filtro por score no rompe el caso de tipeo real (Wharfdale sigue aceptándose con marca+modelo juntos)', () => {
  const r = buscarLocal('spk', 'Wharfdale', 'Linton');
  assert.ok(r.some((eq) => eq.marca === 'Wharfedale'), JSON.stringify(r.map((e) => e.marca)));
});

test('buscarLocal: ambos campos vacíos devuelve el catálogo COMPLETO de la categoría (explorar sin buscar)', () => {
  const r = buscarLocal('dac', '', '');
  assert.equal(r.length, CATALOGO.dacs.length);
});

test('buscarLocal: sólo espacios en blanco cuenta como vacío, igual que cadena vacía', () => {
  const r = buscarLocal('streamer', '   ', '  ');
  assert.equal(r.length, CATALOGO.streamers.length);
});

test('buscarLocal: nunca devuelve más de 8 resultados aunque la consulta sea muy laxa', () => {
  const r = buscarLocal('spk', 'e', ''); // letra suelta — matchea casi cualquier marca
  assert.ok(r.length <= 8, `devolvió ${r.length}`);
});

test('buscarLocal: respeta la categoría — buscar en "amp" nunca devuelve un parlante', () => {
  const r = buscarLocal('amp', 'KEF', '');
  for (const eq of r) assert.ok(CATALOGO.amplificadores.includes(eq as (typeof CATALOGO.amplificadores)[number]));
});
