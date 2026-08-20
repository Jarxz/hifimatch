/**
 * infoHtmlParlante/infoHtmlAmplificador/infoHtmlFuente son puras (no tocan
 * `document` — sólo poblarSelectores/poblarModelos/vaciarModelos lo hacen,
 * ver selectores.ts), así que corren con node --test sin DOM. Cubre
 * específicamente el aviso de "Genérico (Arquetipo)" (config.notaGenerico):
 * debe aparecer sólo cuando el equipo elegido es uno de los 6 perfiles
 * genéricos, nunca en un equipo real del catálogo.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import { infoHtmlParlante, infoHtmlAmplificador, infoHtmlFuente } from './selectores.ts';

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

test('parlante genérico: el HTML incluye la nota de aproximación (config.notaGenerico), antes que el resto de la tarjeta', () => {
  const html = infoHtmlParlante(parlante('generico-parlante-monitor-reactivo'), 'es');
  assert.ok(html.includes('info-nota-generico'), html);
  assert.ok(html.includes('Perfil genérico (arquetipo)'), html);
  assert.ok(html.indexOf('info-nota-generico') < html.indexOf('info-type'));
});

test('amplificador genérico en inglés: nota en inglés, sin mezclar idiomas', () => {
  const html = infoHtmlAmplificador(amplificador('generico-ampli-valvular-alta-zout'), 'en');
  assert.ok(html.includes('info-nota-generico'), html);
  assert.ok(html.includes('Generic profile (archetype)'), html);
  assert.ok(!html.includes('Perfil genérico'), html);
});

test('equipo real (parlante/amplificador): nunca lleva la nota genérica', () => {
  const spk = infoHtmlParlante(parlante('kef-ls50-meta'), 'es');
  const amp = infoHtmlAmplificador(amplificador('cambridge-cxa81'), 'es');
  assert.ok(!spk.includes('info-nota-generico'), spk);
  assert.ok(!amp.includes('info-nota-generico'), amp);
});

test('fuente (streamer/dac): infoHtmlFuente nunca lleva la nota genérica — no hay arquetipos de fuente en esta ronda', () => {
  const f = CATALOGO.streamers[0]!;
  const html = infoHtmlFuente(f, 'es');
  assert.ok(!html.includes('info-nota-generico'), html);
});

test('los 3 parlantes y 3 amplificadores genéricos llevan la nota, en los dos idiomas', () => {
  const generosParlantes = CATALOGO.parlantes.filter((p) => p.marca === 'Genérico (Arquetipo)');
  const generosAmplis = CATALOGO.amplificadores.filter((a) => a.marca === 'Genérico (Arquetipo)');
  assert.equal(generosParlantes.length, 3);
  assert.equal(generosAmplis.length, 3);
  for (const p of generosParlantes) {
    assert.ok(infoHtmlParlante(p, 'es').includes('info-nota-generico'), p.id);
    assert.ok(infoHtmlParlante(p, 'en').includes('info-nota-generico'), p.id);
  }
  for (const a of generosAmplis) {
    assert.ok(infoHtmlAmplificador(a, 'es').includes('info-nota-generico'), a.id);
    assert.ok(infoHtmlAmplificador(a, 'en').includes('info-nota-generico'), a.id);
  }
});
