// PURO — sin DOM. El gráfico sólo dibuja lo que modos.ts ya calculó: estas
// pruebas fijan qué modos entran, que las bandas sean los pares agrupados del
// motor (no un criterio nuevo) y que ningún número de SVG salga con coma.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarModos } from '../../../../packages/engine/src/modos.ts';
import type { ModoAxial } from '../../../../packages/engine/src/modos.ts';
import { construirGraficoModosSvg, modosParaGrafico, paresDibujados, MODOS_POR_EJE } from './graficoModos.ts';

const SALA_3A2 = { anchoM: 3.6, largoM: 5, altoM: 2.4 }; // ancho n=3 y alto n=2 coinciden exacto (142,9 Hz)

test('modosParaGrafico: como máximo tres por eje, todos entre 20 y 200 Hz y por orden creciente', () => {
  const res = evaluarModos(SALA_3A2);
  const m = modosParaGrafico(res.modos);
  for (const eje of ['ancho', 'largo', 'alto'] as const) {
    const delEje = m.filter((x) => x.eje === eje);
    assert.ok(delEje.length <= MODOS_POR_EJE, eje);
    assert.deepEqual(delEje.map((x) => x.orden), [...delEje.map((x) => x.orden)].sort((a, b) => a - b));
  }
  assert.ok(m.every((x) => x.frecuenciaHz >= 20 && x.frecuenciaHz <= 200));
});

test('modosParaGrafico: un modo bajo 20 Hz no se dibuja y se toman sólo los tres primeros', () => {
  const modos: ModoAxial[] = [
    { eje: 'largo', orden: 1, frecuenciaHz: 19.06 },
    { eje: 'largo', orden: 2, frecuenciaHz: 38.1 },
    { eje: 'largo', orden: 3, frecuenciaHz: 57.2 },
    { eje: 'largo', orden: 4, frecuenciaHz: 76.2 },
    { eje: 'largo', orden: 5, frecuenciaHz: 95.3 },
  ];
  assert.deepEqual(modosParaGrafico(modos).map((x) => x.orden), [2, 3, 4]);
});

test('las bandas son los pares agrupados del motor cuyos dos modos se dibujan', () => {
  const res = evaluarModos(SALA_3A2);
  const dibujados = modosParaGrafico(res.modos);
  const pares = paresDibujados(res.agrupados, dibujados);
  assert.ok(pares.length >= 1, 'la sala 3:2 debe tener al menos un par que coincide exacto');
  const svg = construirGraficoModosSvg(res.modos, res.agrupados, 'es');
  // una banda por par + la muestra de la leyenda
  assert.equal((svg.match(/fill-opacity="\.16"/g) ?? []).length, pares.length + 1);
  assert.match(svg, /Frecuencias que coinciden/);
  // ancho n=3 y alto n=2 caen en 143 Hz: la etiqueta aparece en dos filas
  assert.equal((svg.match(/>143</g) ?? []).length, 2);
});

test('sin pares agrupados no hay bandas ni entrada de leyenda', () => {
  const res = evaluarModos(SALA_3A2);
  const svg = construirGraficoModosSvg(res.modos, [], 'es');
  assert.equal((svg.match(/fill-opacity/g) ?? []).length, 0);
  assert.doesNotMatch(svg, /coinciden/);
});

test('leyenda y texto accesible por idioma; sin modos en el rango → cadena vacía', () => {
  const res = evaluarModos(SALA_3A2);
  const es = construirGraficoModosSvg(res.modos, res.agrupados, 'es');
  const en = construirGraficoModosSvg(res.modos, res.agrupados, 'en');
  assert.match(es, />ancho</);
  assert.match(en, />width</);
  assert.match(es, /aria-label="Frecuencias de los primeros modos axiales/);
  assert.match(en, /aria-label="Frequencies of the first axial modes/);
  assert.equal(construirGraficoModosSvg([], [], 'es'), '');
  assert.equal(construirGraficoModosSvg([{ eje: 'ancho', orden: 1, frecuenciaHz: 250 }], [], 'es'), '');
});

test('coordenadas de SVG con punto decimal ASCII, nunca coma (rompe el dibujo sólo en español)', () => {
  const res = evaluarModos({ anchoM: 3.7, largoM: 4.9, altoM: 2.45 });
  const svg = construirGraficoModosSvg(res.modos, res.agrupados, 'es');
  assert.doesNotMatch(svg, /\b(x|y|x1|x2|y1|y2|width|height)="[^"]*,[^"]*"/);
  assert.match(svg, /^<svg viewBox="0 0 470 262"/);
});
