import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import { chipsParlante, especParlante, chipsAmplificador, especAmplificador, chipsFuente, especFuente } from './etiquetas.ts';

function parlante(id: string) {
  const p = CATALOGO.parlantes.find((x) => x.id === id);
  if (!p) throw new Error(`no encontrado: ${id}`);
  return p;
}
function amplificador(id: string) {
  const a = CATALOGO.amplificadores.find((x) => x.id === id);
  if (!a) throw new Error(`no encontrado: ${id}`);
  return a;
}
function fuente(id: string) {
  const f = CATALOGO.fuentes.find((x) => x.id === id);
  if (!f) throw new Error(`no encontrado: ${id}`);
  return f;
}

test('KEF: todos los chips son derivados, sin chipsExtra (impedancia, sensibilidad, mínima, rango de potencia, máx SPL)', () => {
  assert.deepEqual(chipsParlante(parlante('kef-ls50-meta')), ['8 Ω', '85 dB', 'mín 3,5 Ω', '40–100 W', '106 dB máx']);
  assert.equal(especParlante(parlante('kef-ls50-meta')), '8 Ω · 85 dB · mín 3,5 Ω · 40–100 W · 106 dB máx');
});

test('Klipsch: calificador "anecoica" en el chip de sensibilidad; potenciaRecMinW null → sólo el máximo; sin impedancia mínima', () => {
  assert.deepEqual(chipsParlante(parlante('klipsch-rp600m-ii')), ['8 Ω', '86 dB anecoica', '100 W', '44 Hz–25 kHz']);
});

test('Dynaudio: potenciaRecMaxW null → "≥70 W"', () => {
  const chips = chipsParlante(parlante('dynaudio-emit-20'));
  assert.ok(chips.includes('≥70 W'), chips.join(', '));
});

test('impedancia mínima no entera se formatea con sus decimales naturales (5,76 Ω, no 5,8 ni 5,760)', () => {
  const chips = chipsParlante(parlante('revel-performa3-m106'));
  assert.ok(chips.includes('mín 5,76 Ω'), chips.join(', '));
});

test('Cambridge CXA81: 80W/8Ω + 120W/4Ω (sin nota, sin asterisco) + chipsExtra', () => {
  assert.deepEqual(chipsAmplificador(amplificador('cambridge-cxa81')), [
    '80 W / 8 Ω',
    '120 W / 4 Ω',
    'XLR balanceado',
    'DAC ESS',
    'amort. >110',
  ]);
  assert.equal(especAmplificador(amplificador('cambridge-cxa81')), '80 W / 8 Ω · 120 W / 4 Ω');
});

test('Yamaha: potencia4OhmW con nota (condición de medición distinta) → asterisco', () => {
  const chips = chipsAmplificador(amplificador('yamaha-as501'));
  assert.ok(chips.includes('120 W / 4 Ω*'), chips.join(', '));
});

test('NAD: también lleva nota en potencia4OhmW (no dobla, IHF es otra métrica) → también asterisco', () => {
  // El prototipo no se lo ponía (inconsistencia manual); acá sale automático
  // de la misma regla que Yamaha, así que ya no puede volver a faltar.
  const chips = chipsAmplificador(amplificador('nad-c316bee-v2'));
  assert.ok(chips.includes('40 W / 4 Ω*'), chips.join(', '));
});

test('Hegel: recupera el chip de 4 Ω (96 W*) que el prototipo no mostraba — Paso 2 adoptó el dato del seed', () => {
  const chips = chipsAmplificador(amplificador('hegel-h95'));
  assert.ok(chips.includes('96 W / 4 Ω*'), chips.join(', '));
  assert.ok(chips.includes('mín 2 Ω'), chips.join(', '));
});

test('Bluesound Node: V y Ω de salida derivados + chipsExtra', () => {
  assert.deepEqual(chipsFuente(fuente('bluesound-node-n130')), [
    '2,2 V salida',
    '500 Ω salida',
    'PCM5242',
    'hasta 24/192 + MQA',
  ]);
  assert.equal(especFuente(fuente('bluesound-node-n130')), '2,2 V salida · 500 Ω salida');
});

test('WiiM: impedanciaSalidaOhm null → sólo el chip de voltaje, sin placeholder', () => {
  const chips = chipsFuente(fuente('wiim-pro-plus'));
  assert.deepEqual(chips.slice(0, 1), ['2,0 V salida']);
  assert.ok(!chips.some((c) => c.includes('Ω salida')));
});

test('Cambridge CXN V2: sin ningún chip físico (salidaV e impedanciaSalidaOhm null) → especFuente cae a chipsExtra en vez de quedar vacío', () => {
  assert.deepEqual(chipsFuente(fuente('cambridge-cxn-v2')), ['RCA + XLR', '2× WM8740']);
  assert.equal(especFuente(fuente('cambridge-cxn-v2')), 'RCA + XLR · 2× WM8740');
});
