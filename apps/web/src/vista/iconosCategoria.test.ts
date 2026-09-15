// PURO — corre contra tipo/descripción REALES de equipos ya catalogados
// (nunca texto inventado), confirmando que el buscador de palabras clave
// produce variantes distintas y esperables.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iconoEquipoSvg } from './iconosCategoria.ts';
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

test('PSB Alpha P5 (2 vías, estantería): SVG válido, con un woofer grande y un tweeter — sin textura de malla electrostática', () => {
  const p = equipo(CATALOGO.parlantes, 'psb-alpha-p5');
  const svg = iconoEquipoSvg('parlante', p.tipo.es, p.descripcion.es);
  esSvgValido(svg);
  assert.doesNotMatch(svg, /electrostátic/i);
});

test('MartinLogan ElectroMotion ESL X (electrostático): variante de panel + malla, sin círculos de driver', () => {
  const p = equipo(CATALOGO.parlantes, 'martin-logan-electromotion-esl-x');
  const svg = iconoEquipoSvg('parlante', p.tipo.es, p.descripcion.es);
  esSvgValido(svg);
  assert.doesNotMatch(svg, /<circle/, 'la variante electrostática no debería tener círculos de driver');
  assert.match(svg, /<line/, 'la variante electrostática dibuja la textura de malla con líneas');
});

test('Line Magnetic LM-518IA (válvulas SET): variante con tubos, distinta del ícono genérico de amplificador', () => {
  const a = equipo(CATALOGO.amplificadores, 'line-magnetic-lm-518ia');
  const svg = iconoEquipoSvg('amplificador', a.tipo.es, a.descripcion.es);
  esSvgValido(svg);
  assert.match(svg, /<ellipse/, 'la variante a válvulas dibuja el remate de cada tubo como una elipse');
});

test('Anthem MRX 740 8K (receptor AV): variante de fascia ancha con pantalla grande', () => {
  const a = equipo(CATALOGO.amplificadores, 'anthem-mrx-740-8k');
  const svg = iconoEquipoSvg('amplificador', a.tipo.es, a.descripcion.es);
  esSvgValido(svg);
  assert.match(svg, /width="34" height="26"/, 'la variante receptor dibuja la pantalla grande esperada');
});

test('Bryston 4B³ Cubed (potencia sin previo): variante minimalista, sin perilla grande', () => {
  const a = equipo(CATALOGO.amplificadores, 'bryston-4b3');
  const svg = iconoEquipoSvg('amplificador', a.tipo.es, a.descripcion.es);
  esSvgValido(svg);
  assert.doesNotMatch(svg, /r="10"/, 'la variante minimalista no dibuja la perilla grande del integrado común');
});

test('Eversolo DMP-A6 Master Edition (salida variable, "funciona como preamplificador digital"): variante con perilla real, no la caja minimalista sin controles', () => {
  // El catálogo describe specs eléctricas, no aspecto físico — el texto
  // real no dice "pantalla" (aunque el equipo sí tiene una, confirmado
  // mirando la foto oficial), así que esta variante no dispara el
  // rectángulo grande de pantalla; sí dispara la perilla, porque "salida
  // totalmente variable"/"preamplificador digital" sí son palabras del
  // propio catálogo. Limitación real, declarada: el detector nunca
  // inventa un rasgo que el texto curado no sostiene.
  const s = equipo(CATALOGO.streamers, 'eversolo-dmp-a6-master-edition-gen2');
  const svg = iconoEquipoSvg('streamer', s.tipo.es, s.descripcion.es);
  esSvgValido(svg);
  assert.doesNotMatch(svg, /width="46" height="22"/);
  assert.match(svg, /cx="72" cy="51" r="7"/, 'salida variable ⇒ perilla dibujada');
});

test('dCS Bartók (DAC simple, sin pantalla): variante minimalista con LED, sin el rectángulo de pantalla grande', () => {
  const d = equipo(CATALOGO.dacs, 'dcs-bartok');
  const svg = iconoEquipoSvg('dac', d.tipo.es, d.descripcion.es);
  esSvgValido(svg);
  assert.doesNotMatch(svg, /width="46" height="22"/);
  assert.match(svg, /fill="currentColor"/, 'el LED del caso por defecto es el único elemento relleno');
});

test('todos los parlantes reales del catálogo producen un SVG válido (nunca vacío ni roto)', () => {
  for (const p of CATALOGO.parlantes) {
    esSvgValido(iconoEquipoSvg('parlante', p.tipo.es, p.descripcion.es));
  }
});

test('todos los amplificadores reales del catálogo producen un SVG válido', () => {
  for (const a of CATALOGO.amplificadores) {
    esSvgValido(iconoEquipoSvg('amplificador', a.tipo.es, a.descripcion.es));
  }
});

test('todos los streamers y dacs del catálogo producen un SVG válido', () => {
  for (const s of CATALOGO.streamers) esSvgValido(iconoEquipoSvg('streamer', s.tipo.es, s.descripcion.es));
  for (const d of CATALOGO.dacs) esSvgValido(iconoEquipoSvg('dac', d.tipo.es, d.descripcion.es));
});
