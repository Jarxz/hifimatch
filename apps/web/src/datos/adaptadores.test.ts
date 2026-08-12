/**
 * Reemplaza durablemente el harness de scratch que cargaba el bundle viejo
 * y extraía los adaptadores del HTML con regex (ver CLAUDE.md). Los mismos
 * vectores de docs/motor-mvp.md, pero pasando por el catálogo real
 * (packages/data) en vez de fixtures literales copiadas a mano — si alguien
 * edita un dato del catálogo, estos tests lo detectan.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarPotencia } from '../../../../packages/engine/src/potencia.ts';
import { evaluarCarga } from '../../../../packages/engine/src/carga.ts';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from '../../../../packages/engine/src/ganancia.ts';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import { parlanteDelCatalogo, amplificadorDelCatalogo, fuenteDelCatalogo } from './adaptadores.ts';

const EPS = 0.05; // tolerancia estándar del proyecto (motor-mvp.md, cabecera)

function parlante(id: string) {
  const p = CATALOGO.parlantes.find((x) => x.id === id);
  if (!p) throw new Error(`parlante no encontrado en el catálogo: ${id}`);
  return parlanteDelCatalogo(p, 'es');
}
function amplificador(id: string) {
  const a = CATALOGO.amplificadores.find((x) => x.id === id);
  if (!a) throw new Error(`amplificador no encontrado en el catálogo: ${id}`);
  return amplificadorDelCatalogo(a, 'es');
}
function fuente(id: string) {
  const f = CATALOGO.fuentes.find((x) => x.id === id);
  if (!f) throw new Error(`fuente no encontrada en el catálogo: ${id}`);
  return fuenteDelCatalogo(f, 'es');
}

// ---- motor-mvp.md sección 2 (potencia) ----

test('§2 Vector A — Klipsch + Cambridge CXA81, 2,5 m, alto: margen +6,07 → Con margen', () => {
  const r = evaluarPotencia(parlante('klipsch-rp600m-ii'), amplificador('cambridge-cxa81'), 2.5, 'alto');
  assert.ok(Math.abs(r.splDisponibleDb - 106.07) < EPS);
  assert.ok(Math.abs(r.margenDb - 6.07) < EPS);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'con-margen');
});

test('§2 Vector B — KEF + Rega Brio, 3,0 m, alto: margen +1,45 → Justo', () => {
  const r = evaluarPotencia(parlante('kef-ls50-meta'), amplificador('rega-brio'), 3.0, 'alto');
  assert.ok(Math.abs(r.margenDb - 1.45) < EPS);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'justo');
});

test('§2 Vector C — KEF + Rega Brio, 3,0 m, referencia: margen −3,55 → Insuficiente', () => {
  const r = evaluarPotencia(parlante('kef-ls50-meta'), amplificador('rega-brio'), 3.0, 'referencia');
  assert.ok(Math.abs(r.margenDb - -3.55) < EPS);
  assert.equal(r.severidad, 'alert');
  assert.equal(r.codigo, 'insuficiente');
});

// ---- motor-mvp.md sección 3 (carga) ----

test('§3 KEF (minZ 3,5) + Cambridge CXA81 (80/120): dura, potente → Cubierto', () => {
  const r = evaluarCarga(parlante('kef-ls50-meta'), amplificador('cambridge-cxa81'));
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'cubierto');
});

test('§3 KEF (minZ 3,5) + Rega Brio (50/73): dura, reserva 1,46<1,7, no potente → Exige corriente', () => {
  const r = evaluarCarga(parlante('kef-ls50-meta'), amplificador('rega-brio'));
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'exige-corriente');
});

test('§3 Klipsch (minZ null) + cualquier ampli → Sin dato', () => {
  const r = evaluarCarga(parlante('klipsch-rp600m-ii'), amplificador('cambridge-cxa81'));
  assert.equal(r.severidad, 'sin-datos');
  assert.equal(r.codigo, 'sin-dato');
});

// ---- motor-mvp.md sección 6.3 (ganancia de cadena) ----

test('§6 A — Topping E30 II → Cambridge CXA81: Puente correcto, Recorrido sano', () => {
  const z = evaluarPuenteImpedancias(fuente('topping-e30-ii'), amplificador('cambridge-cxa81'));
  const v = evaluarRecorridoVolumen(fuente('topping-e30-ii'), amplificador('cambridge-cxa81'));
  assert.equal(z.codigo, 'puente-correcto');
  assert.equal(v.codigo, 'recorrido-sano');
});

test('§6 B — Schiit Modi+ → Denon PMA-600NE: Puente correcto, Recorrido corto (caso más exigente)', () => {
  const z = evaluarPuenteImpedancias(fuente('schiit-modi-plus'), amplificador('denon-pma600ne'));
  const v = evaluarRecorridoVolumen(fuente('schiit-modi-plus'), amplificador('denon-pma600ne'));
  assert.equal(z.codigo, 'puente-correcto');
  assert.equal(v.codigo, 'recorrido-corto');
});

test('§6 C — Bluesound Node → Rega Brio: Puente correcto, Recorrido corto', () => {
  const z = evaluarPuenteImpedancias(fuente('bluesound-node-n130'), amplificador('rega-brio'));
  const v = evaluarRecorridoVolumen(fuente('bluesound-node-n130'), amplificador('rega-brio'));
  assert.equal(z.codigo, 'puente-correcto');
  assert.equal(v.codigo, 'recorrido-corto');
});

test('§6 D — NAD C316BEE V2 (sin impedanciaEntradaOhm) + Schiit Modi+: sin-datos en puente, recorrido corre igual', () => {
  const z = evaluarPuenteImpedancias(fuente('schiit-modi-plus'), amplificador('nad-c316bee-v2'));
  const v = evaluarRecorridoVolumen(fuente('schiit-modi-plus'), amplificador('nad-c316bee-v2'));
  assert.equal(z.severidad, 'sin-datos');
  assert.equal(v.codigo, 'recorrido-sano');
});

test('§6 E — Cambridge CXN V2 (sin salidaV ni impedanciaSalidaOhm) + cualquier ampli: sin-datos en ambas', () => {
  const z = evaluarPuenteImpedancias(fuente('cambridge-cxn-v2'), amplificador('cambridge-cxa81'));
  const v = evaluarRecorridoVolumen(fuente('cambridge-cxn-v2'), amplificador('cambridge-cxa81'));
  assert.equal(z.severidad, 'sin-datos');
  assert.equal(v.severidad, 'sin-datos');
});

test('§6 F — Hegel H95 (sin sensEntradaMv ni impedanciaEntradaOhm) + cualquier fuente: sin-datos en ambas', () => {
  const z = evaluarPuenteImpedancias(fuente('topping-e30-ii'), amplificador('hegel-h95'));
  const v = evaluarRecorridoVolumen(fuente('topping-e30-ii'), amplificador('hegel-h95'));
  assert.equal(z.severidad, 'sin-datos');
  assert.equal(v.severidad, 'sin-datos');
});

// ---- el adaptador usa la cita real, no un resumen de specs (bug del prototipo) ----

test('el adaptador pone en `fuente` una cita real, no el resumen de specs (bug que tenía prototipo-frontend.html)', () => {
  const amp = amplificador('cambridge-cxa81');
  assert.equal(amp.potencia8OhmW.fuente, 'Cambridge Audio (ficha oficial)');
  assert.notEqual(amp.potencia8OhmW.fuente, amp.tipo); // no es un resumen de specs ni el tipo
});

test('idioma "en" cambia fuente/tipo/nombre-de-producto según corresponda', () => {
  const kefEs = parlante('kef-ls50-meta');
  const kefCat = CATALOGO.parlantes.find((p) => p.id === 'kef-ls50-meta')!;
  const kefEn = parlanteDelCatalogo(kefCat, 'en');
  assert.equal(kefEn.nombre, kefEs.nombre); // nombre de producto no se traduce
  assert.notEqual(kefEn.tipo, kefEs.tipo); // tipo sí
  assert.notEqual(kefEn.sensibilidadDb.fuente, kefEs.sensibilidadDb.fuente); // fuente sí
});
