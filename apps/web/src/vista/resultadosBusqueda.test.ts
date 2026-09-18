import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modeloListaResultados, modeloEstadoBusqueda, modeloPanelManual, modeloSinCoincidenciasLocales } from './resultadosBusqueda.ts';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';

test('modeloListaResultados: lista vacía devuelve string vacío, nunca un contenedor sin filas', () => {
  assert.equal(modeloListaResultados([], 'spk', 'es', false), '');
});

test('modeloListaResultados: una fila por equipo, con data-elegir-id = el id real', () => {
  const kef = CATALOGO.parlantes.find((p) => p.id === 'kef-ls50-meta')!;
  const html = modeloListaResultados([kef], 'spk', 'es', true);
  assert.ok(html.includes('data-elegir-id="kef-ls50-meta"'), html);
  assert.ok(html.includes('KEF'), html);
});

test('modeloListaResultados: ordenarPorRelevancia=false ordena alfabéticamente por marca (modo "explorar todo")', () => {
  const equipos = [...CATALOGO.parlantes].reverse(); // orden deliberadamente invertido
  const html = modeloListaResultados(equipos, 'spk', 'es', false);
  const primeraMarcaEnHtml = html.match(/ri-marca">([^<]+)</)![1];
  const marcasOrdenadas = [...new Set(CATALOGO.parlantes.map((p) => p.marca))].sort((a, b) => a.localeCompare(b));
  assert.equal(primeraMarcaEnHtml, marcasOrdenadas[0]);
});

test('modeloListaResultados: ordenarPorRelevancia=true NO reordena — respeta el ranking de Fuse.js', () => {
  const kef = CATALOGO.parlantes.find((p) => p.id === 'kef-ls50-meta')!;
  const wharfedale = CATALOGO.parlantes.find((p) => p.marca === 'Wharfedale')!;
  const html = modeloListaResultados([kef, wharfedale], 'spk', 'es', true);
  assert.ok(html.indexOf('kef-ls50-meta') < html.indexOf(wharfedale.id), 'debe conservar el orden dado, no alfabetizar');
});

test('modeloListaResultados: escapa caracteres HTML de marca/nombre (equipo web con datos no confiables)', () => {
  const equipoHostil = {
    id: 'web:parlante:x-y',
    marca: '<script>alert(1)</script>',
    nombre: 'Modelo "peligroso"',
    tipo: { es: 'Parlante', en: 'Speaker' },
    descripcion: { es: '', en: '' },
    sensibilidadDb: { valor: 88, fuente: { es: '', en: '' }, confianza: 'baja' as const },
    sensibilidadConvencion: null,
    impedanciaNominalOhm: 8,
    impedanciaMinOhm: null,
    impedanciaMaxOhm: null,
    anguloFaseGrados: null,
    potenciaRecMinW: null,
    potenciaRecMaxW: null,
    maxSplDb: null,
    chipsExtra: [],
    fuentes: [],
  };
  const html = modeloListaResultados([equipoHostil], 'spk', 'es', true);
  assert.ok(!html.includes('<script>'), html);
  assert.ok(html.includes('&lt;script&gt;'), html);
});

test('modeloListaResultados: mostrarBuscarWeb=false (default) no agrega el botón de saltar al catálogo local', () => {
  const kef = CATALOGO.parlantes.find((p) => p.id === 'kef-ls50-meta')!;
  const html = modeloListaResultados([kef], 'spk', 'es', true);
  assert.ok(!html.includes('buscar-ninguno-web'), html);
});

test('modeloListaResultados: mostrarBuscarWeb=true agrega el botón "ninguno de estos" — Fuse.js encuentra un candidato local parecido pero no bloquea la búsqueda web', () => {
  const kef = CATALOGO.parlantes.find((p) => p.id === 'kef-ls50-meta')!;
  const html = modeloListaResultados([kef], 'spk', 'es', true, true);
  assert.ok(html.includes('buscar-ninguno-web'), html);
  assert.ok(html.includes('Ninguno de estos'), html);
});

test('modeloListaResultados: mostrarBuscarWeb=true en inglés, sin mezclar idiomas', () => {
  const kef = CATALOGO.parlantes.find((p) => p.id === 'kef-ls50-meta')!;
  const html = modeloListaResultados([kef], 'spk', 'en', true, true);
  assert.ok(html.includes('None of these'), html);
  assert.ok(!html.includes('Ninguno'), html);
});

test('modeloSinCoincidenciasLocales: declara que no hay coincidencias en el catálogo curado, con un solo botón para pasar a la web', () => {
  const html = modeloSinCoincidenciasLocales('es');
  assert.ok(html.includes('Sin coincidencias en el catálogo curado'), html);
  assert.ok(html.includes('buscar-ninguno-web'), 'reusa la misma clase que el listener delegado de main.ts ya maneja');
  assert.ok(html.includes('Ninguno de estos'), html);
});

test('modeloSinCoincidenciasLocales en inglés: sin mezclar idiomas', () => {
  const html = modeloSinCoincidenciasLocales('en');
  assert.ok(html.includes('No matches in the curated catalog'), html);
  assert.ok(!html.includes('coincidencias'), html);
});

test('modeloEstadoBusqueda: envuelve el texto ya redactado sin modificarlo', () => {
  assert.equal(modeloEstadoBusqueda('Buscando en la web…'), '<p class="resultado-estado">Buscando en la web…</p>');
});

test('modeloPanelManual: parlante NUNCA pide sensibilidad/impedancia a mano — esos números los entrega el buscador, no el usuario', () => {
  const html = modeloPanelManual('spk', 'es');
  assert.ok(!html.includes('<input'), 'un parlante sin resultado no debe mostrar ningún campo numérico');
  assert.ok(!html.includes('manual-sensibilidad'));
  assert.ok(!html.includes('manual-impedancia'));
  assert.ok(html.includes('manual-solicitar-alta'), 'la única acción disponible es avisar al sitio');
});
test('modeloPanelManual: amplificador tampoco pide potencia a mano', () => {
  const html = modeloPanelManual('amp', 'es');
  assert.ok(!html.includes('<input'));
  assert.ok(!html.includes('manual-potencia'));
  assert.ok(html.includes('manual-solicitar-alta'));
});
test('modeloPanelManual: streamer/dac no piden ningún campo numérico — sólo "usar sin datos" (el motor no exige ninguno para esta categoría)', () => {
  const streamer = modeloPanelManual('streamer', 'es');
  const dac = modeloPanelManual('dac', 'es');
  assert.ok(streamer.includes('manual-usar-sin-datos'));
  assert.ok(dac.includes('manual-usar-sin-datos'));
  assert.ok(!streamer.includes('<input'));
  assert.ok(!dac.includes('<input'));
});
test('modeloPanelManual en inglés: textos en inglés, sin mezclar idiomas, sin campos numéricos', () => {
  const html = modeloPanelManual('spk', 'en');
  assert.ok(html.includes("couldn't be retrieved automatically"));
  assert.ok(!html.includes('automáticamente'));
  assert.ok(!html.includes('<input'));
});
