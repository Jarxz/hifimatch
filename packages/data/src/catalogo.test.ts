import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO } from './catalogo.ts';
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
  ...CATALOGO.fuentes,
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

test('conteo de equipos por categoría: 13 parlantes + 12 amplis + 8 fuentes (streamers+DACs) + 3 cables = 36', () => {
  assert.equal(CATALOGO.parlantes.length, 13);
  assert.equal(CATALOGO.amplificadores.length, 12);
  assert.equal(CATALOGO.fuentes.length, 8);
  assert.equal(CATALOGO.cables.length, 3);
  assert.equal(TODOS_LOS_EQUIPOS.length, 36);
});

test('nombre no está vacío en ningún equipo (no se traduce, así que no pasa por el recorrido de Localizado)', () => {
  for (const eq of TODOS_LOS_EQUIPOS) {
    assert.ok(eq.nombre.trim().length > 0, `nombre vacío: ${eq.id}`);
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
  const ALLOWLIST_ES = [/\b\d\.\d+\s?V\b/i]; // "2.83V" citado dentro de prosa técnica en español
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
    for (const campo of [p.impedanciaMinOhm, p.potenciaRecMinW, p.potenciaRecMaxW, p.maxSplDb]) {
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
    for (const campo of [a.cargaMinOhm, a.sensEntradaMv, a.impedanciaEntradaOhm]) {
      assert.ok(campo === null || (typeof campo === 'number' && !Number.isNaN(campo)), a.id);
    }
  }
});

test('fuentes: salidaV/impedanciaSalidaOhm son number|null, nunca NaN ni 0 como sentinela de "sin dato"', () => {
  for (const f of CATALOGO.fuentes) {
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
