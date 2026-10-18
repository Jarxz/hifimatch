// PURO — sin DOM. El nombre de un sistema lo escribe el usuario y se vuelve a
// mostrar dentro de un cuadro con innerHTML: hay que escapar siempre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import type { SistemaGuardado } from '../datos/sistemasGuardados.ts';
import { equiposDe, modeloTarjetaSistema, nombreSugerido, cuerpoGuardarHtml, cuerpoGuardadoHtml, cuerpoEliminarHtml, cuerpoErrorHtml } from './sistemas.ts';

const SPK = CATALOGO.parlantes.find((p) => !p.id.startsWith('generico'))!;
const AMP = CATALOGO.amplificadores.find((a) => !a.id.startsWith('generico'))!;
const STREAMER = CATALOGO.streamers[0]!;

const SISTEMA: SistemaGuardado = {
  id: 'abc',
  nombre: 'Sala principal',
  guardadoEn: Date.UTC(2026, 8, 27, 15),
  config: {
    spk: SPK.id,
    amp: AMP.id,
    streamer: STREAMER.id,
    dac: null,
    W: 3.6,
    L: 5,
    H: 2.4,
    lvl: 'alto',
    genero: 'clasica',
    muroFrontal: 'yesoCarton',
    muroPosterior: 'yesoCarton',
    muroIzquierdo: 'yesoCarton',
    muroDerecho: 'yesoCarton',
    piso: 'alfombra',
    techo: 'yesoCarton',
  },
};

test('equiposDe: nombres reales del catálogo unidos con "+", streamer/DAC sólo si hay', () => {
  assert.equal(equiposDe(SISTEMA), `${SPK.nombre} + ${AMP.nombre} + ${STREAMER.nombre}`);
  assert.equal(equiposDe({ ...SISTEMA, config: { ...SISTEMA.config, streamer: null } }), `${SPK.nombre} + ${AMP.nombre}`);
});

test('modeloTarjetaSistema: sala con separador decimal por idioma, nivel y género traducidos', () => {
  const es = modeloTarjetaSistema(SISTEMA, 'es');
  assert.equal(es.sala, '3,6 × 5,0 × 2,40 m');
  assert.equal(es.escucha, 'Alto · Clásica');
  assert.match(es.fechaTexto, /2026/);
  const en = modeloTarjetaSistema(SISTEMA, 'en');
  assert.equal(en.sala, '3.6 × 5.0 × 2.40 m');
  assert.equal(en.escucha, 'Loud · Classical');
});

test('nombreSugerido: parlante + amplificador, acotado al largo máximo', () => {
  assert.equal(nombreSugerido('KEF LS50 Meta', 'Rega Brio'), 'KEF LS50 Meta + Rega Brio');
  assert.ok(nombreSugerido('A'.repeat(200), 'B'.repeat(200)).length <= 80);
});

test('el nombre del sistema se escapa en cada cuadro (guardar, guardado, eliminar)', () => {
  const malo = '<img src=x onerror=alert(1)> "&\'';
  const guardar = cuerpoGuardarHtml(malo, 'es');
  assert.doesNotMatch(guardar, /<img/);
  assert.match(guardar, /value="&lt;img src=x onerror=alert\(1\)&gt; &quot;&amp;&#39;"/);
  assert.doesNotMatch(cuerpoGuardadoHtml(malo, 'es'), /<img/);
  const eliminar = cuerpoEliminarHtml('id"><script>', malo, 'es');
  assert.doesNotMatch(eliminar, /<img|<script/);
  assert.match(eliminar, /data-id="id&quot;&gt;&lt;script&gt;"/);
});

test('los cuadros traen las acciones que el frontend delega (data-popup-accion)', () => {
  assert.match(cuerpoGuardarHtml('x', 'es'), /data-popup-accion="cerrar"/);
  assert.match(cuerpoGuardarHtml('x', 'es'), /type="submit"/);
  assert.match(cuerpoGuardadoHtml('x', 'es'), /data-popup-accion="ir-sistemas"/);
  assert.match(cuerpoEliminarHtml('abc', 'x', 'es'), /data-popup-accion="eliminar" data-id="abc"/);
});

test('cuerpoErrorHtml: cada código de guardado tiene texto en los dos idiomas', () => {
  for (const codigo of ['nombre-vacio', 'sin-equipos', 'equipo-fuera-de-catalogo', 'almacen-bloqueado', 'limite-alcanzado'] as const) {
    assert.ok(cuerpoErrorHtml(codigo, 'es').length > 60, codigo);
    assert.notEqual(cuerpoErrorHtml(codigo, 'es'), cuerpoErrorHtml(codigo, 'en'), codigo);
  }
});
