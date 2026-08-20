import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO, MARCA_GENERICA, PARLANTES_GENERICOS, AMPLIFICADORES_GENERICOS } from './catalogo.ts';
import type { Idioma } from './idioma.ts';

const IDIOMAS: readonly Idioma[] = ['es', 'en'];

function esLocalizado(v: unknown): v is Record<Idioma, string> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const claves = Object.keys(v);
  return claves.length === IDIOMAS.length && IDIOMAS.every((i) => typeof (v as Record<string, unknown>)[i] === 'string');
}

/**
 * Recorre cualquier valor del catálogo y junta los objetos con forma
 * Localizado que encuentre. Evita tener que listar a mano cada campo
 * localizado de cada categoría en este archivo — que es justo lo que se
 * desactualiza cuando el esquema crece.
 */
function recolectarLocalizados(valor: unknown, encontrados: Array<Record<Idioma, string>> = []): Array<Record<Idioma, string>> {
  if (esLocalizado(valor)) {
    encontrados.push(valor);
    return encontrados;
  }
  if (Array.isArray(valor)) {
    for (const item of valor) recolectarLocalizados(item, encontrados);
  } else if (typeof valor === 'object' && valor !== null) {
    for (const v of Object.values(valor)) recolectarLocalizados(v, encontrados);
  }
  return encontrados;
}

const TODOS_LOS_EQUIPOS = [
  ...CATALOGO.parlantes,
  ...CATALOGO.amplificadores,
  ...CATALOGO.streamers,
  ...CATALOGO.dacs,
  ...CATALOGO.cables,
];

test('el recorrido de Localizado encuentra algo (guardia contra un catálogo vacío o un predicado roto)', () => {
  assert.ok(recolectarLocalizados(CATALOGO).length > 50);
});

test('cada texto localizado tiene es y en no vacíos', () => {
  for (const loc of recolectarLocalizados(CATALOGO)) {
    for (const idioma of IDIOMAS) {
      assert.ok(loc[idioma].trim().length > 0, `texto vacío en "${idioma}": ${JSON.stringify(loc)}`);
    }
  }
});

test('ids únicos en todo el catálogo', () => {
  const ids = TODOS_LOS_EQUIPOS.map((e) => e.id);
  const vistos = new Set<string>();
  for (const id of ids) {
    assert.ok(!vistos.has(id), `id duplicado: ${id}`);
    vistos.add(id);
  }
});

test('conteo de equipos por categoría: 38 parlantes (35 reales + 3 genéricos) + 37 amplis (34 reales + 3 genéricos) + 30 streamers + 30 dacs + 3 cables = 138', () => {
  assert.equal(CATALOGO.parlantes.length, 38);
  assert.equal(CATALOGO.amplificadores.length, 37);
  assert.equal(CATALOGO.streamers.length, 30);
  assert.equal(CATALOGO.dacs.length, 30);
  assert.equal(CATALOGO.cables.length, 3);
  assert.equal(TODOS_LOS_EQUIPOS.length, 138);
});

test('nombre no está vacío en ningún equipo (no se traduce, así que no pasa por el recorrido de Localizado)', () => {
  for (const eq of TODOS_LOS_EQUIPOS) {
    assert.ok(eq.nombre.trim().length > 0, `nombre vacío: ${eq.id}`);
  }
});

test('marca no está vacía y nombre empieza con marca, en las 4 categorías con selector marca→modelo (parlantes/amplis/streamers/dacs)', () => {
  for (const eq of [...CATALOGO.parlantes, ...CATALOGO.amplificadores, ...CATALOGO.streamers, ...CATALOGO.dacs]) {
    assert.ok(eq.marca.trim().length > 0, `marca vacía: ${eq.id}`);
    assert.ok(eq.nombre.startsWith(eq.marca), `nombre "${eq.nombre}" no empieza con marca "${eq.marca}" (${eq.id})`);
  }
});

test('fuentes[] bibliográficas no están vacías (no se traducen: son citas, no prosa)', () => {
  for (const eq of TODOS_LOS_EQUIPOS) {
    assert.ok(eq.fuentes.length > 0, `sin fuentes bibliográficas: ${eq.id}`);
  }
});

test('lint de separador decimal: "es" no lleva punto entre dígitos, "en" no lleva coma entre dígitos', () => {
  // Imperfecto a propósito (no es una garantía, es una red de contención):
  // hay excepciones legítimas (nombres de modelo, formatos de audio) que se
  // agregan acá si el catálogo crece y alguna empieza a matchear.
  const ALLOWLIST_ES = [
    /\b\d\.\d+\s?V\b/i, // "2.83V" citado dentro de prosa técnica en español
    /\bDiamond 12\.1\b/, // nombre de producto (Wharfedale Diamond 12.1), no un decimal
  ];
  const ALLOWLIST_EN: RegExp[] = [];

  function limpiar(texto: string, allowlist: RegExp[]): string {
    return allowlist.reduce((t, re) => t.replace(re, ''), texto);
  }

  for (const loc of recolectarLocalizados(CATALOGO)) {
    const es = limpiar(loc.es, ALLOWLIST_ES);
    const en = limpiar(loc.en, ALLOWLIST_EN);
    assert.ok(!/\d\.\d/.test(es), `posible punto decimal en texto "es" (¿debería ser coma?): ${JSON.stringify(loc.es)}`);
    assert.ok(!/\d,\d/.test(en), `posible coma decimal en texto "en" (¿debería ser punto?): ${JSON.stringify(loc.en)}`);
  }
});

test('parlantes: sensibilidadDb.valor y impedanciaNominalOhm son numéricos válidos; el resto es number|null, nunca NaN', () => {
  for (const p of CATALOGO.parlantes) {
    assert.equal(typeof p.sensibilidadDb.valor, 'number');
    assert.ok(!Number.isNaN(p.sensibilidadDb.valor), p.id);
    assert.equal(typeof p.impedanciaNominalOhm, 'number');
    for (const campo of [p.impedanciaMinOhm, p.impedanciaMaxOhm, p.anguloFaseGrados, p.potenciaRecMinW, p.potenciaRecMaxW, p.maxSplDb]) {
      assert.ok(campo === null || (typeof campo === 'number' && !Number.isNaN(campo)), p.id);
    }
  }
});

test('amplificadores: potencia8OhmW.valor es numérico; el resto es number|null, nunca NaN', () => {
  for (const a of CATALOGO.amplificadores) {
    assert.equal(typeof a.potencia8OhmW.valor, 'number');
    assert.ok(!Number.isNaN(a.potencia8OhmW.valor), a.id);
    if (a.potencia4OhmW !== null) {
      assert.ok(!Number.isNaN(a.potencia4OhmW.valor), a.id);
    }
    for (const campo of [a.cargaMinOhm, a.sensEntradaMv, a.impedanciaEntradaOhm, a.factorAmortiguamiento]) {
      assert.ok(campo === null || (typeof campo === 'number' && !Number.isNaN(campo)), a.id);
    }
  }
});

// ---- Genérico (Arquetipo): perfiles de respaldo para equipos fuera de catálogo ----

test('Genérico (Arquetipo): exactamente 3 parlantes y 3 amplificadores, agrupados bajo MARCA_GENERICA', () => {
  const parlantesGenericos = CATALOGO.parlantes.filter((p) => p.marca === MARCA_GENERICA);
  const amplisGenericos = CATALOGO.amplificadores.filter((a) => a.marca === MARCA_GENERICA);
  assert.equal(parlantesGenericos.length, 3);
  assert.equal(amplisGenericos.length, 3);
  assert.deepEqual(PARLANTES_GENERICOS, parlantesGenericos);
  assert.deepEqual(AMPLIFICADORES_GENERICOS, amplisGenericos);
});

test('Genérico (Arquetipo): confianza "baja" en todo dato numérico declarado (sensibilidad/potencia) — nunca se muestra como si fuera medido', () => {
  for (const p of PARLANTES_GENERICOS) {
    assert.equal(p.sensibilidadDb.confianza, 'baja', p.id);
  }
  for (const a of AMPLIFICADORES_GENERICOS) {
    assert.equal(a.potencia8OhmW.confianza, 'baja', a.id);
    if (a.potencia4OhmW !== null) assert.equal(a.potencia4OhmW.confianza, 'baja', a.id);
  }
});

test('Genérico (Arquetipo): valores físicos exactos de los 3 parlantes (Zmín/fase/Zmáx)', () => {
  const monitor = PARLANTES_GENERICOS[0]!;
  const columna = PARLANTES_GENERICOS[1]!;
  const filtro = PARLANTES_GENERICOS[2]!;
  assert.equal(monitor.impedanciaMinOhm, 3.5);
  assert.equal(monitor.anguloFaseGrados, -55.0);
  assert.equal(monitor.impedanciaMaxOhm, 30.0);
  assert.equal(columna.impedanciaMinOhm, 4.8);
  assert.equal(columna.anguloFaseGrados, -35.0);
  assert.equal(columna.impedanciaMaxOhm, 24.0);
  assert.equal(filtro.impedanciaMinOhm, 6.2);
  assert.equal(filtro.anguloFaseGrados, -15.0);
  assert.equal(filtro.impedanciaMaxOhm, 16.0);
});

test('Genérico (Arquetipo): factor de amortiguamiento exacto de los 3 amplificadores', () => {
  const altaCorriente = AMPLIFICADORES_GENERICOS[0]!;
  const vintageAvr = AMPLIFICADORES_GENERICOS[1]!;
  const valvular = AMPLIFICADORES_GENERICOS[2]!;
  assert.equal(altaCorriente.factorAmortiguamiento, 400);
  assert.equal(vintageAvr.factorAmortiguamiento, 60);
  assert.equal(valvular.factorAmortiguamiento, 8);
});

test('streamers y dacs: salidaV/impedanciaSalidaOhm son number|null, nunca NaN ni 0 como sentinela de "sin dato"', () => {
  for (const f of [...CATALOGO.streamers, ...CATALOGO.dacs]) {
    for (const campo of [f.salidaV, f.impedanciaSalidaOhm]) {
      assert.ok(campo === null || (typeof campo === 'number' && campo > 0), f.id);
    }
  }
});

test('cables: magnitudes físicas son positivas (nunca 0 ni negativas)', () => {
  for (const c of CATALOGO.cables) {
    assert.ok(c.resistenciaOhmM > 0, c.id);
    assert.ok(c.capacitanciaPfM > 0, c.id);
    assert.ok(c.inductanciaUhM > 0, c.id);
    assert.ok(c.calibreAwg === null || c.calibreAwg > 0, c.id);
  }
});
