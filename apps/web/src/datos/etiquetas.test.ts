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
  const f = [...CATALOGO.streamers, ...CATALOGO.dacs].find((x) => x.id === id);
  if (!f) throw new Error(`no encontrado: ${id}`);
  return f;
}

test('KEF: todos los chips son derivados, sin chipsExtra (impedancia, sensibilidad, mínima, rango de potencia, máx SPL)', () => {
  assert.deepEqual(chipsParlante(parlante('kef-ls50-meta'), 'es'), ['8 Ω', '85 dB', 'mín 3,5 Ω', '40–100 W', '106 dB máx']);
  assert.equal(especParlante(parlante('kef-ls50-meta'), 'es'), '8 Ω · 85 dB · mín 3,5 Ω · 40–100 W · 106 dB máx');
});

test('Klipsch: calificador "anecoica" en el chip de sensibilidad; potenciaRecMinW null → sólo el máximo; sin impedancia mínima', () => {
  assert.deepEqual(chipsParlante(parlante('klipsch-rp600m-ii'), 'es'), ['8 Ω', '86 dB anecoica', '100 W', '44 Hz–25 kHz']);
});

test('Dynaudio: potenciaRecMaxW null → "≥70 W"', () => {
  const chips = chipsParlante(parlante('dynaudio-emit-20'), 'es');
  assert.ok(chips.includes('≥70 W'), chips.join(', '));
});

test('impedancia mínima no entera se formatea con sus decimales naturales (5,76 Ω, no 5,8 ni 5,760)', () => {
  const chips = chipsParlante(parlante('revel-performa3-m106'), 'es');
  assert.ok(chips.includes('mín 5,76 Ω'), chips.join(', '));
});

test('Cambridge CXA81: 80W/8Ω + 120W/4Ω (sin nota, sin asterisco) + mín 4 Ω + chipsExtra', () => {
  assert.deepEqual(chipsAmplificador(amplificador('cambridge-cxa81'), 'es'), [
    '80 W / 8 Ω',
    '120 W / 4 Ω',
    'mín 4 Ω',
    'XLR balanceado',
    'DAC ESS',
    'amort. >110',
  ]);
  assert.equal(especAmplificador(amplificador('cambridge-cxa81'), 'es'), '80 W / 8 Ω · 120 W / 4 Ω · mín 4 Ω');
});

test('Yamaha: potencia4OhmW con nota (condición de medición distinta) → asterisco', () => {
  const chips = chipsAmplificador(amplificador('yamaha-as501'), 'es');
  assert.ok(chips.includes('120 W / 4 Ω*'), chips.join(', '));
});

test('NAD: también lleva nota en potencia4OhmW (no dobla, IHF es otra métrica) → también asterisco', () => {
  // El prototipo no se lo ponía (inconsistencia manual); acá sale automático
  // de la misma regla que Yamaha, así que ya no puede volver a faltar.
  const chips = chipsAmplificador(amplificador('nad-c316bee-v2'), 'es');
  assert.ok(chips.includes('40 W / 4 Ω*'), chips.join(', '));
});

test('Hegel: recupera el chip de 4 Ω (96 W*) que el prototipo no mostraba — Paso 2 adoptó el dato del seed', () => {
  const chips = chipsAmplificador(amplificador('hegel-h95'), 'es');
  assert.ok(chips.includes('96 W / 4 Ω*'), chips.join(', '));
  assert.ok(chips.includes('mín 2 Ω'), chips.join(', '));
});

test('Bluesound Node: V y Ω de salida derivados + chipsExtra', () => {
  assert.deepEqual(chipsFuente(fuente('bluesound-node-n130'), 'es'), [
    '2,2 V salida',
    '500 Ω salida',
    'PCM5242',
    'hasta 24/192 + MQA',
  ]);
  assert.equal(especFuente(fuente('bluesound-node-n130'), 'es'), '2,2 V salida · 500 Ω salida');
});

test('WiiM: impedancia de salida cerrada en el Paso 9 (10 Ω, Hi-Fi News) — ya no falta ese chip', () => {
  const chips = chipsFuente(fuente('wiim-pro-plus'), 'es');
  assert.deepEqual(chips.slice(0, 2), ['2,0 V salida', '10 Ω salida']);
  assert.ok(chips.includes('salida configurable'), chips.join(', '));
});

test('Cambridge CXN V2: sin ningún chip físico (salidaV e impedanciaSalidaOhm null) → especFuente cae a chipsExtra en vez de quedar vacío', () => {
  assert.deepEqual(chipsFuente(fuente('cambridge-cxn-v2'), 'es'), ['RCA + XLR', '2× WM8740']);
  assert.equal(especFuente(fuente('cambridge-cxn-v2'), 'es'), 'RCA + XLR · 2× WM8740');
});

// ---- idioma 'en' ----

test('KEF en inglés: etiquetas "min"/"max" traducidas, punto decimal', () => {
  assert.deepEqual(chipsParlante(parlante('kef-ls50-meta'), 'en'), ['8 Ω', '85 dB', 'min 3.5 Ω', '40–100 W', '106 dB max']);
});

test('Bluesound Node en inglés: "output" en vez de "salida", coma de miles si aplica', () => {
  const chips = chipsFuente(fuente('bluesound-node-n130'), 'en');
  assert.deepEqual(chips.slice(0, 2), ['2.2 V output', '500 Ω output']);
});

test('Cambridge CXA81 en inglés: "min" en el chip de carga mínima del amplificador', () => {
  const chips = chipsAmplificador(amplificador('rega-brio'), 'en');
  assert.ok(chips.includes('min 4 Ω'), chips.join(', '));
});

// ---- chips derivados de impedanciaMaxOhm/anguloFaseGrados/factorAmortiguamiento ----
// Ningún equipo real del catálogo tiene estos 3 campos poblados todavía (ver
// CLAUDE.md "Falta"), así que sólo los 3 parlantes y 3 amplificadores
// genéricos ejercitan esta rama — cero riesgo de regresión sobre los 132
// equipos reales, que siguen devolviendo exactamente los mismos chips.

test('Genérico (Arquetipo) — Monitor de alta reactividad: agrega chips Zmáx y θ (fase), además de mín', () => {
  const chips = chipsParlante(parlante('generico-parlante-monitor-reactivo'), 'es');
  assert.deepEqual(chips.slice(0, 5), ['4 Ω', '86 dB', 'mín 3,5 Ω', 'Zmáx 30 Ω', 'θ -55°']);
});

test('Genérico (Arquetipo) — Columna estándar en inglés: "Zmax" (no "Zmáx"), mismo signo de fase', () => {
  const chips = chipsParlante(parlante('generico-parlante-columna-estandar'), 'en');
  assert.deepEqual(chips.slice(0, 5), ['6 Ω', '89 dB', 'min 4.8 Ω', 'Zmax 24 Ω', 'θ -35°']);
});

test('Genérico (Arquetipo) — Filtro purista dócil: no dispara chip de fase/Zmáx si esos campos fueran null (guardia de regresión con el propio arquetipo, que sí los declara)', () => {
  const chips = chipsParlante(parlante('generico-parlante-filtro-docil'), 'es');
  assert.ok(chips.includes('Zmáx 16 Ω'), chips.join(', '));
  assert.ok(chips.includes('θ -15°'), chips.join(', '));
});

test('Genérico (Arquetipo) — Estado sólido, alta corriente: agrega chip DF', () => {
  const chips = chipsAmplificador(amplificador('generico-ampli-ss-alta-corriente'), 'es');
  assert.ok(chips.includes('DF 400'), chips.join(', '));
});

test('Genérico (Arquetipo) — Válvulas, alta impedancia de salida: DF bajo (8), sin chip de 4 Ω (potencia4OhmW null)', () => {
  const chips = chipsAmplificador(amplificador('generico-ampli-valvular-alta-zout'), 'es');
  assert.deepEqual(chips, ['35 W / 8 Ω', 'mín 4 Ω', 'DF 8']);
});
