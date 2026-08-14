import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarModos } from '../../../../packages/engine/src/modos.ts';
import type { Sala } from '../../../../packages/engine/src/sala.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { construirCurvasModalesSvg } from './curvamodal.ts';

const SALA_CON_AGRUPAMIENTO: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // motor-mvp.md sección 4bis
const SALA_SIN_AGRUPAMIENTO: Sala = { anchoM: 2.5, largoM: 3.0, altoM: 2.2 };
const IDIOMAS: readonly Idioma[] = ['es', 'en'];

test('sin modos agrupados: devuelve string vacío — no hay nada que explicar visualmente', () => {
  const r = evaluarModos(SALA_SIN_AGRUPAMIENTO);
  assert.equal(r.agrupados.length, 0);
  for (const idioma of IDIOMAS) {
    assert.equal(construirCurvasModalesSvg(SALA_SIN_AGRUPAMIENTO, r.agrupados, idioma), '');
  }
});

test('sala con agrupamiento (3,6×5,0×2,4): un <svg> por cada eje afectado (ancho, largo y alto los tres agrupan), un <polyline> por orden distinto', () => {
  const r = evaluarModos(SALA_CON_AGRUPAMIENTO);
  const ordenesDistintosPorEje = new Set(r.agrupados.flatMap((a) => [`${a.modoA.eje}-${a.modoA.orden}`, `${a.modoB.eje}-${a.modoB.orden}`]));
  for (const idioma of IDIOMAS) {
    const svg = construirCurvasModalesSvg(SALA_CON_AGRUPAMIENTO, r.agrupados, idioma);
    assert.equal((svg.match(/<svg /g) ?? []).length, 3, idioma);
    assert.equal((svg.match(/<\/svg>/g) ?? []).length, 3, idioma);
    assert.equal((svg.match(/<polyline/g) ?? []).length, ordenesDistintosPorEje.size, idioma);
  }
});

test('coordenadas geométricas (points de la curva SVG) siempre "N.D" — un solo punto decimal, nunca coma', () => {
  const r = evaluarModos(SALA_CON_AGRUPAMIENTO);
  for (const idioma of IDIOMAS) {
    const svg = construirCurvasModalesSvg(SALA_CON_AGRUPAMIENTO, r.agrupados, idioma);
    for (const m of svg.matchAll(/points="([^"]*)"/g)) {
      const pares = m[1]!.trim().split(' ');
      assert.ok(pares.length > 0, `[${idioma}] points vacío`);
      for (const par of pares) {
        const [x, y] = par.split(',');
        assert.ok(x && /^\d+\.\d$/.test(x), `[${idioma}] x inválido: "${x}"`);
        assert.ok(y && /^\d+\.\d$/.test(y), `[${idioma}] y inválido: "${y}"`);
      }
    }
  }
});

test('leyenda: frecuencias formateadas por locale — coma en español, punto en inglés', () => {
  const r = evaluarModos(SALA_CON_AGRUPAMIENTO);
  const svgEs = construirCurvasModalesSvg(SALA_CON_AGRUPAMIENTO, r.agrupados, 'es');
  assert.match(svgEs, /orden 3 \(142,9 Hz\)/); // ancho, orden 3
  assert.doesNotMatch(svgEs, /142\.9 Hz/);

  const svgEn = construirCurvasModalesSvg(SALA_CON_AGRUPAMIENTO, r.agrupados, 'en');
  assert.match(svgEn, /order 3 \(142\.9 Hz\)/);
  assert.doesNotMatch(svgEn, /142,9 Hz/);
});

test('las etiquetas de eje están traducidas: "ancho/largo/alto" en español, "width/length/height" en inglés', () => {
  const r = evaluarModos(SALA_CON_AGRUPAMIENTO);
  const svgEs = construirCurvasModalesSvg(SALA_CON_AGRUPAMIENTO, r.agrupados, 'es');
  assert.match(svgEs, />ancho</);
  assert.match(svgEs, />largo</);
  assert.match(svgEs, />alto</);

  const svgEn = construirCurvasModalesSvg(SALA_CON_AGRUPAMIENTO, r.agrupados, 'en');
  assert.match(svgEn, />width</);
  assert.match(svgEn, />length</);
  assert.match(svgEn, />height</);
});
