// PURO — corre el motor real (elegirMatchDelMes) y arma el modelo de
// pantalla sobre ese resultado real, sin mocks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elegirMatchDelMes } from '../datos/matchDelMes.ts';
import { modeloMatchDelMes } from './matchDelMes.ts';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';

const FECHA_FIJA = new Date(2026, 8, 1);

test('modeloMatchDelMes: marca/nombre de cada pieza coinciden con el catálogo real, nunca inventados', () => {
  const match = elegirMatchDelMes(FECHA_FIJA);
  assert.ok(match);
  const modelo = modeloMatchDelMes(match!, 'es');
  assert.ok(modelo);

  const parlanteCat = CATALOGO.parlantes.find((p) => p.id === match!.parlanteId)!;
  const ampCat = CATALOGO.amplificadores.find((a) => a.id === match!.amplificadorId)!;
  const itemParlante = modelo!.items.find((i) => i.categoria === 'parlante')!;
  const itemAmp = modelo!.items.find((i) => i.categoria === 'amplificador')!;

  assert.equal(itemParlante.marca, parlanteCat.marca);
  assert.equal(itemParlante.nombre, parlanteCat.nombre);
  assert.equal(itemAmp.marca, ampCat.marca);
  assert.equal(itemAmp.nombre, ampCat.nombre);
});

test('modeloMatchDelMes: exactamente 2 a 4 ítems — parlante y amplificador siempre, streamer/dac sólo si el match los trae', () => {
  const match = elegirMatchDelMes(FECHA_FIJA);
  assert.ok(match);
  const modelo = modeloMatchDelMes(match!, 'es');
  assert.ok(modelo);
  assert.ok(modelo!.items.length >= 2 && modelo!.items.length <= 4);
  assert.ok(modelo!.items.some((i) => i.categoria === 'parlante'));
  assert.ok(modelo!.items.some((i) => i.categoria === 'amplificador'));
  assert.equal(modelo!.items.some((i) => i.categoria === 'streamer'), match!.streamerId !== null);
  assert.equal(modelo!.items.some((i) => i.categoria === 'dac'), match!.dacId !== null);
});

test('modeloMatchDelMes: cada ítem trae al menos un chip físico y un ícono SVG no vacío', () => {
  const match = elegirMatchDelMes(FECHA_FIJA);
  assert.ok(match);
  const modelo = modeloMatchDelMes(match!, 'es');
  assert.ok(modelo);
  for (const item of modelo!.items) {
    assert.ok(item.chips.length > 0, `${item.nombre} debería tener al menos un chip`);
    assert.match(item.iconoSvg, /^<svg/);
  }
});

test('modeloMatchDelMes: el veredicto se reusa tal cual (no se redacta de nuevo) — clase "warn", título de "con límites"', () => {
  const match = elegirMatchDelMes(FECHA_FIJA);
  assert.ok(match);
  const modelo = modeloMatchDelMes(match!, 'es');
  assert.ok(modelo);
  assert.equal(modelo!.veredictoClase, match!.veredicto.general);
  assert.equal(modelo!.veredictoClase, 'warn');
  assert.ok(modelo!.veredictoTituloHtml.length > 0);
});

test('modeloMatchDelMes en inglés: textos en inglés, sin mezclar idiomas', () => {
  const match = elegirMatchDelMes(FECHA_FIJA);
  assert.ok(match);
  const modelo = modeloMatchDelMes(match!, 'en');
  assert.ok(modelo);
  assert.equal(modelo!.rotuloCriterio, 'Editorial criterion, not physics');
  assert.doesNotMatch(modelo!.introHtml, /[áéíóúñ¿¡]/i);
});

test('modeloMatchDelMes: mesEtiqueta refleja el mes/año del match, capitalizado', () => {
  const match = elegirMatchDelMes(new Date(2027, 2, 15)); // marzo 2027
  assert.ok(match);
  const modelo = modeloMatchDelMes(match!, 'es');
  assert.ok(modelo);
  assert.match(modelo!.mesEtiqueta, /^[A-ZÁÉÍÓÚ]/);
  assert.match(modelo!.mesEtiqueta, /2027/);
});

test('modeloMatchDelMes: nota de sala de referencia declara explícitamente que no es la sala del visitante', () => {
  const match = elegirMatchDelMes(FECHA_FIJA);
  assert.ok(match);
  const modelo = modeloMatchDelMes(match!, 'es');
  assert.ok(modelo);
  assert.match(modelo!.notaSalaReferencia, /no la tuya|sala de referencia/i);
});
