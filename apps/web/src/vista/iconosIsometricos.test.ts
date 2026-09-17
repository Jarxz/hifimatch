// PURO — corre contra tipo/descripción REALES de equipos ya catalogados
// (nunca texto inventado), mismo criterio que iconosCategoria.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iconoIsometricoSvg } from './iconosIsometricos.ts';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';

function equipo<T extends { id: string }>(lista: readonly T[], id: string): T {
  const e = lista.find((x) => x.id === id);
  assert.ok(e, `no se encontró el equipo "${id}" en el catálogo — ¿cambió el id?`);
  return e!;
}

function esSvgValido(svg: string): void {
  assert.match(svg, /^<svg[^>]*>/);
  assert.match(svg, /<\/svg>$/);
  assert.ok(svg.length > 20, 'el SVG generado no debería quedar vacío');
}

/** Todos los pares "x y" de un `d` de SVG (comandos M/L, sin el "Z" final) —
 * suficiente para comparar qué vértices comparten dos paths, sin tener que
 * exportar la geometría interna del módulo ni recalcularla a mano acá. */
function coordenadasDe(d: string): Set<string> {
  return new Set((d.match(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g) ?? []).map((m) => m.slice(1)));
}

test('iconoIsometricoSvg: dibuja 3 caras (superior/frontal/lateral) — la caja tiene volumen, no es una silueta plana', () => {
  const p = equipo(CATALOGO.parlantes, 'psb-alpha-p5');
  const svg = iconoIsometricoSvg('parlante', p.tipo.es, p.descripcion.es);
  esSvgValido(svg);
  assert.equal((svg.match(/<path/g) ?? []).length >= 4, true, 'esperaba al menos 3 caras + 1 grupo de detalles frontales');
  assert.match(svg, /opacity="0.4"/, 'la cara lateral se atenúa para dar sensación de profundidad');
  assert.match(svg, /opacity="0.65"/, 'la cara superior se atenúa distinto de la lateral');
});

test('iconoIsometricoSvg: las 3 caras visibles tocan el vértice más alto del dibujo (regresión de un bug real: la cara lateral se dibujaba del lado x=w, que bajo esta proyección NO es el vértice más alto — dos caras cualquiera de un cubo siempre comparten UNA arista, así que esa comprobación no alcanza; hace falta el vértice específico que corona el contorno)', () => {
  // Equipo sin válvulas a propósito: con válvulas se intercala un 4to
  // <path> (los tubos) entre la cara superior y la frontal, y este test
  // asume que los primeros 3 <path> son justo lateral/superior/frontal.
  const p = equipo(CATALOGO.parlantes, 'psb-alpha-p5');
  const svg = iconoIsometricoSvg('parlante', p.tipo.es, p.descripcion.es);
  const [, ...resto] = svg.split('<path d="');
  const [lateral, superior, frontal] = resto.map((s) => s.slice(0, s.indexOf('"')));
  assert.ok(lateral && superior && frontal, 'esperaba encontrar las 3 primeras caras en el SVG');

  const cLateral = coordenadasDe(lateral!);
  const cSuperior = coordenadasDe(superior!);
  const cFrontal = coordenadasDe(frontal!);

  // El vértice más alto del dibujo completo (menor "y" — el sistema SVG
  // crece hacia abajo) tiene que pertenecer a las 3 caras a la vez: es el
  // único punto donde "arriba" (cara superior), "adelante" (cara frontal)
  // y "al costado" (cara lateral) se encuentran. Con el lado equivocado
  // (bug real, x=w en vez de x=0), la cara lateral no lo incluye — aunque
  // siga compartiendo una arista distinta con cada una de las otras dos
  // por separado, por eso una comprobación par-a-par no lo detectaba.
  const todas = [...cLateral, ...cSuperior, ...cFrontal];
  const vertice = (s: string): [number, number] => s.split(' ').map(Number) as [number, number];
  const cima = todas.reduce((min, p) => (vertice(p)[1] < vertice(min)[1] ? p : min));

  assert.ok(cLateral.has(cima), `la cara lateral no toca el vértice más alto (${cima})`);
  assert.ok(cSuperior.has(cima), `la cara superior no toca el vértice más alto (${cima})`);
  assert.ok(cFrontal.has(cima), `la cara frontal no toca el vértice más alto (${cima})`);
});

test('iconoIsometricoSvg: todo amplificador dibuja perforaciones diagonales sobre la cara superior (rasgo decorativo genérico, referencia Gold Note IS-10 — foto del usuario), con o sin válvulas', () => {
  const solido = equipo(CATALOGO.amplificadores, 'bryston-4b3');
  const valvular = equipo(CATALOGO.amplificadores, 'line-magnetic-lm-518ia');
  for (const a of [solido, valvular]) {
    const svg = iconoIsometricoSvg('amplificador', a.tipo.es, a.descripcion.es);
    assert.match(svg, /opacity="0.5" stroke-width="1">/, `${a.nombre}: esperaba las líneas de perforación sobre la cara superior`);
  }
});

test('iconoIsometricoSvg: un parlante o una fuente NUNCA dibujan perforaciones (rasgo exclusivo del amplificador)', () => {
  const p = equipo(CATALOGO.parlantes, 'psb-alpha-p5');
  const svgParlante = iconoIsometricoSvg('parlante', p.tipo.es, p.descripcion.es);
  assert.doesNotMatch(svgParlante, /opacity="0.5" stroke-width="1">/);
});

test('iconoIsometricoSvg: parlante de 2 vías (PSB Alpha P5) dibuja 2 círculos frontales proyectados — 3 caras + 2 drivers = 5 subpaths en total', () => {
  // Cada cara y cada círculo proyectado (circuloFrontal → pathDe) es
  // exactamente un subpath "M...Z" — contar los "M" totales del SVG es un
  // conteo robusto (no depende de coordenadas exactas, que varían con el
  // tamaño real de la caja) para distinguir 2 vías de 3.
  const p = equipo(CATALOGO.parlantes, 'psb-alpha-p5');
  const svg = iconoIsometricoSvg('parlante', p.tipo.es, p.descripcion.es);
  esSvgValido(svg);
  const subpaths = (svg.match(/M-?\d/g) ?? []).length;
  assert.equal(subpaths, 5, `3 caras + 2 drivers esperados, subpaths encontrados: ${subpaths}`);
});

test('iconoIsometricoSvg: amplificador a válvulas (Line Magnetic LM-518IA) agrega tubos sobre la cara superior', () => {
  const a = equipo(CATALOGO.amplificadores, 'line-magnetic-lm-518ia');
  const svg = iconoIsometricoSvg('amplificador', a.tipo.es, a.descripcion.es);
  esSvgValido(svg);
  assert.match(svg, /stroke-width="1.3"/, 'el grupo de válvulas usa un trazo propio, distinto del resto');
});

test('iconoIsometricoSvg: amplificador de estado sólido común NO dibuja tubos', () => {
  const a = equipo(CATALOGO.amplificadores, 'bryston-4b3');
  const svg = iconoIsometricoSvg('amplificador', a.tipo.es, a.descripcion.es);
  esSvgValido(svg);
  assert.doesNotMatch(svg, /stroke-width="1.3"/);
});

test('iconoIsometricoSvg: streamer/dac con "pantalla" en el texto dibuja un rectángulo frontal proyectado, no el LED relleno', () => {
  // Ningún streamer/dac REAL del catálogo dice "pantalla" en su
  // descripción todavía (mismo límite ya declarado en
  // iconosCategoria.test.ts con el Eversolo DMP-A6: el catálogo describe
  // specs eléctricas, no aspecto físico) — se ejercita la rama con texto
  // sintético, igual criterio que buscador.test.ts usa fixtures propios
  // en vez de depender de que el catálogo real tenga ese caso.
  const svg = iconoIsometricoSvg('dac', 'DAC con pantalla a color', 'Cuenta con una pantalla táctil grande en el frente.');
  esSvgValido(svg);
  assert.doesNotMatch(svg, /fill="currentColor"/, 'con pantalla, no debería dibujarse además el LED relleno');
});

test('iconoIsometricoSvg: dCS Bartók (DAC simple, sin pantalla) dibuja el LED relleno, mismo criterio que la versión 2D', () => {
  const d = equipo(CATALOGO.dacs, 'dcs-bartok');
  const svg = iconoIsometricoSvg('dac', d.tipo.es, d.descripcion.es);
  esSvgValido(svg);
  assert.match(svg, /fill="currentColor" stroke="none"/, 'el LED es el único elemento relleno, mismo criterio que iconosCategoria.ts');
});

test('iconoIsometricoSvg: parlante de columna (piso) es más alto que uno de estantería — proporciones distintas, no el mismo cubo reescalado a ojo', () => {
  const columna = CATALOGO.parlantes.find((p) => /columna|piso/i.test(`${p.tipo.es} ${p.descripcion.es}`) && !/electrostátic/i.test(p.descripcion.es));
  const estanteria = equipo(CATALOGO.parlantes, 'psb-alpha-p5');
  assert.ok(columna, 'se esperaba al menos un parlante de columna real en el catálogo');
  const svgColumna = iconoIsometricoSvg('parlante', columna!.tipo.es, columna!.descripcion.es);
  const svgEstanteria = iconoIsometricoSvg('parlante', estanteria.tipo.es, estanteria.descripcion.es);
  assert.notEqual(svgColumna, svgEstanteria);
});

test('todos los parlantes reales del catálogo producen un SVG isométrico válido', () => {
  for (const p of CATALOGO.parlantes) esSvgValido(iconoIsometricoSvg('parlante', p.tipo.es, p.descripcion.es));
});

test('todos los amplificadores reales del catálogo producen un SVG isométrico válido', () => {
  for (const a of CATALOGO.amplificadores) esSvgValido(iconoIsometricoSvg('amplificador', a.tipo.es, a.descripcion.es));
});

test('todos los streamers y dacs del catálogo producen un SVG isométrico válido', () => {
  for (const s of CATALOGO.streamers) esSvgValido(iconoIsometricoSvg('streamer', s.tipo.es, s.descripcion.es));
  for (const d of CATALOGO.dacs) esSvgValido(iconoIsometricoSvg('dac', d.tipo.es, d.descripcion.es));
});
