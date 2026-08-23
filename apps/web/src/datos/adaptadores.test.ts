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
import { evaluarAmortiguamiento } from '../../../../packages/engine/src/amortiguamiento.ts';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from '../../../../packages/engine/src/ganancia.ts';
import { CATALOGO, MARCA_GENERICA } from '../../../../packages/data/src/catalogo.ts';
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
  const f = [...CATALOGO.streamers, ...CATALOGO.dacs].find((x) => x.id === id);
  if (!f) throw new Error(`fuente no encontrada en el catálogo: ${id}`);
  return fuenteDelCatalogo(f, 'es');
}

// ---- motor-mvp.md sección 2 (potencia) ----

// Vectores recalculados tras la corrección del módulo de potencia
// (auditoría externa — ver packages/engine/src/potencia.ts y potencia.test.ts
// para el detalle de los 3 cambios). Klipsch y KEF no declaran convención de
// sensibilidad en su fuente citada, y son ambos de 8 Ω nominales: el único
// movimiento real es el del cambio 3 (SUMA_PAR_DB 6→3, sin GANANCIA_SALA_DB
// sumada), una baja neta de 6 dB — misma cifra que potencia.test.ts.

test('§2 Vector A — Klipsch + Cambridge CXA81, 2,5 m, alto: margen +0,07 → Justo (antes +6,07 → Con margen)', () => {
  const r = evaluarPotencia(parlante('klipsch-rp600m-ii'), amplificador('cambridge-cxa81'), 2.5, 2.5, 'alto', 5.0);
  assert.ok(Math.abs(r.splDisponibleDb - 100.07) < EPS);
  assert.ok(Math.abs(r.margenDb - 0.07) < EPS);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'justo');
});

test('§2 Vector B — KEF + Rega Brio, 3,0 m, alto: margen −4,55 → Insuficiente (antes +1,45 → Justo)', () => {
  const r = evaluarPotencia(parlante('kef-ls50-meta'), amplificador('rega-brio'), 3.0, 3.0, 'alto', 5.0);
  assert.ok(Math.abs(r.margenDb - -4.55) < EPS);
  assert.equal(r.severidad, 'alert');
  assert.equal(r.codigo, 'insuficiente');
});

test('§2 Vector C — KEF + Rega Brio, 3,0 m, referencia: margen −9,55 → Insuficiente (antes −3,55, ya era Insuficiente)', () => {
  const r = evaluarPotencia(parlante('kef-ls50-meta'), amplificador('rega-brio'), 3.0, 3.0, 'referencia', 5.0);
  assert.ok(Math.abs(r.margenDb - -9.55) < EPS);
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

test('§6 (Paso 9) — WiiM Pro Plus → Cambridge CXA81: ya no es sin-datos. Impedancia de salida cerrada en 10 Ω (Hi-Fi News, medición independiente) → ratioZ=4300 Puente correcto; margenV≈5,41 Recorrido sano', () => {
  const z = evaluarPuenteImpedancias(fuente('wiim-pro-plus'), amplificador('cambridge-cxa81'));
  const v = evaluarRecorridoVolumen(fuente('wiim-pro-plus'), amplificador('cambridge-cxa81'));
  assert.equal(z.codigo, 'puente-correcto');
  assert.ok(Math.abs((z.ratioZ as number) - 4300) < 0.01);
  assert.equal(v.codigo, 'recorrido-sano');
  assert.ok(Math.abs((v.margenV as number) - 5.4054) < 0.01);
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

// ---- Genérico (Arquetipo): los 6 perfiles de respaldo alimentan EPDR,
// Amortiguamiento y Potencia sin caer en "sin-datos" — ver CLAUDE.md,
// ronda "Perfiles genéricos de respaldo". Vectores calculados con Node
// (no a mano), mismo criterio que el resto de este archivo. ----

test('Genérico: los 6 perfiles existen en el catálogo bajo MARCA_GENERICA', () => {
  const parlantesGenericos = CATALOGO.parlantes.filter((p) => p.marca === MARCA_GENERICA);
  const amplisGenericos = CATALOGO.amplificadores.filter((a) => a.marca === MARCA_GENERICA);
  assert.equal(parlantesGenericos.length, 3);
  assert.equal(amplisGenericos.length, 3);
});

test('Genérico: Monitor de alta reactividad (Zmín 3,5, θ −55°) + Válvulas alta Zout (DF 8) — EPDR y Amortiguamiento calculan en "alert", nunca "sin-datos"', () => {
  const spk = parlante('generico-parlante-monitor-reactivo');
  const amp = amplificador('generico-ampli-valvular-alta-zout');

  const carga = evaluarCarga(spk, amp);
  assert.notEqual(carga.severidad, 'sin-datos');
  assert.ok(carga.epdrOhm !== null);
  assert.ok(Math.abs((carga.epdrOhm as number) - 1.924) < EPS);
  assert.equal(carga.thetaEsSupuesto, false); // fase declarada por el arquetipo, no el fallback -45°
  assert.equal(carga.severidad, 'alert');
  assert.equal(carga.codigo, 'epdr-critico');

  const amort = evaluarAmortiguamiento(spk, amp);
  assert.notEqual(amort.severidad, 'sin-datos');
  assert.ok(amort.deltaDb !== null);
  assert.ok(Math.abs((amort.deltaDb as number) - 1.898) < EPS);
  assert.equal(amort.zMaxEsSupuesto, false); // Zmáx declarado por el arquetipo, no el fallback de 25 Ω
  assert.equal(amort.severidad, 'alert');
  assert.equal(amort.codigo, 'critico');
});

test('Genérico: Filtro purista dócil (Zmín 6,2, θ −15°) + Estado sólido alta corriente (DF 400) — la combinación más benigna da "ok" en carga y amortiguamiento, con datos igual de completos', () => {
  const spk = parlante('generico-parlante-filtro-docil');
  const amp = amplificador('generico-ampli-ss-alta-corriente');

  const carga = evaluarCarga(spk, amp);
  assert.ok(Math.abs((carga.epdrOhm as number) - 4.925) < EPS);
  assert.equal(carga.severidad, 'ok');

  const amort = evaluarAmortiguamiento(spk, amp);
  assert.ok(Math.abs((amort.deltaDb as number) - 0.017) < EPS);
  assert.equal(amort.severidad, 'ok');
  assert.equal(amort.codigo, 'optimo');
});

test('Genérico: Potencia (Hopkins-Stryker) corre de punta a punta para los 6 perfiles — sensibilidadDb/potencia8OhmW nunca faltan', () => {
  // Recalculado tras la corrección del módulo de potencia — ver
  // potencia.test.ts. s1 era margen +12,2185 → "Con margen"; ahora +6,2185
  // (baja 6 dB, el mismo neto del cambio 3 — filtro-docil es 8 Ω nominal,
  // los cambios 1/2 no le aplican). Sigue "Con margen": el margen previo
  // tenía sobra de sobra.
  const s1 = evaluarPotencia(parlante('generico-parlante-filtro-docil'), amplificador('generico-ampli-ss-alta-corriente'), 3.0, 3.0, 'alto', 5.0);
  assert.ok(Math.abs(s1.margenDb - 6.2185) < EPS);
  assert.equal(s1.severidad, 'ok');
  assert.equal(s1.codigo, 'con-margen');
  assert.equal(s1.confianza, 'baja'); // hereda la confianza declarada de los datos sintéticos, no se disfraza de "alta"

  // s2: monitor-reactivo es 4 Ω nominal y no declara convención de
  // sensibilidad, así que además del cambio 2 (potenciaDeCargaEstimada=true,
  // el ampli valvular no publica potencia4OhmW) entra sensibilidadRangoAplica
  // (4Ω<8Ω, la ambigüedad sí mueve el número): el margen headline usa el
  // extremo PESIMISTA (−8,12, no el −5,10 de una ronda anterior de este
  // mismo cambio, que todavía no distinguía por impedancia) — sigue
  // "Insuficiente" de cualquier forma, el rango completo lo confirma.
  const s2 = evaluarPotencia(parlante('generico-parlante-monitor-reactivo'), amplificador('generico-ampli-valvular-alta-zout'), 3.0, 3.0, 'alto', 5.0);
  assert.ok(Math.abs(s2.margenDb - -8.1169) < EPS);
  assert.equal(s2.severidad, 'alert');
  assert.equal(s2.codigo, 'insuficiente');
  assert.equal(s2.potenciaDeCargaEstimada, true);
  assert.equal(s2.sensibilidadRangoAplica, true);
  assert.equal(s2.confianza, 'baja');
  assert.ok(s2.margenRangoDb !== null);
  // extremo optimista (si la sensibilidad ya estuviera a 1W): −5,1017 —
  // el mismo número que daba el cálculo antes de distinguir por impedancia.
  // Negativo también: "Insuficiente" en los dos extremos del rango, no
  // sólo en el pesimista.
  assert.ok(Math.abs(s2.margenRangoDb![1] - -5.1017) < EPS);
  assert.ok(s2.margenRangoDb![1] < 0);
});
