import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDisposicion } from '../../../../packages/engine/src/sala.ts';
import type { Sala } from '../../../../packages/engine/src/sala.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { construirPlanoSvg } from './plano.ts';
import type { MurosVista } from './plano.ts';

const SALA_VECTOR: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // motor-mvp.md sección 4
const IDIOMAS: readonly Idioma[] = ['es', 'en'];
const MUROS_TIPICOS: MurosVista = { frontal: 'yesoCarton', posterior: 'yesoCarton', izquierdo: 'madera', derecho: 'madera' };

test('vector de motor-mvp.md sección 4 (W=3,6, L=5,0): el SVG isométrico generado está bien formado, en cualquier idioma', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  for (const idioma of IDIOMAS) {
    const svg = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, idioma);
    assert.match(svg, /^<svg viewBox="0 0 \d+ \d+"/, idioma);
    assert.match(svg, /<\/svg>$/, idioma);
    assert.equal((svg.match(/<rect/g) ?? []).length, 2, idioma); // 2 parlantes (ya no hay <rect> de sala: es un wireframe)
    // sin muros "vacío": 8 reflexiones (lateral×2, trasera×2, techo×2, piso×2) + anillo del punto dulce + punto dulce
    assert.equal((svg.match(/<circle/g) ?? []).length, 10, idioma);
    // cubo de alambre (12 aristas) + triángulo de escucha (2)
    assert.equal((svg.match(/<line/g) ?? []).length, 14, idioma);
    // piso (relleno) + 8 caminos de reflexión
    assert.equal((svg.match(/<polyline/g) ?? []).length, 9, idioma);
  }
});

test('muro "vacío" no dibuja su reflexión: menos círculos y polylines que con todos los muros sólidos', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const conAbertura: MurosVista = { ...MUROS_TIPICOS, izquierdo: 'vacio' };
  const svgTipico = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'es');
  const svgAbierto = construirPlanoSvg(SALA_VECTOR, disp, conAbertura, 'es');
  // se pierde 1 reflexión (lateral izquierda): 10→9 círculos, 9→8 polylines
  assert.equal((svgAbierto.match(/<circle/g) ?? []).length, (svgTipico.match(/<circle/g) ?? []).length - 1);
  assert.equal((svgAbierto.match(/<polyline/g) ?? []).length, (svgTipico.match(/<polyline/g) ?? []).length - 1);
  // el cubo de alambre no cambia: sigue siendo la misma caja rígida
  assert.equal((svgAbierto.match(/<line/g) ?? []).length, (svgTipico.match(/<line/g) ?? []).length);
});

test('muro posterior "vacío" quita las DOS reflexiones traseras (izq y der comparten el mismo muro)', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const conAberturaTrasera: MurosVista = { ...MUROS_TIPICOS, posterior: 'vacio' };
  const svgTipico = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'es');
  const svgAbierto = construirPlanoSvg(SALA_VECTOR, disp, conAberturaTrasera, 'es');
  assert.equal((svgAbierto.match(/<circle/g) ?? []).length, (svgTipico.match(/<circle/g) ?? []).length - 2);
});

test('coordenadas geométricas: nunca coma decimal en NINGÚN idioma (un atributo "x=81,4" es inválido y el navegador lo descarta)', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const ATRIBUTOS_ESCALARES = ['x', 'y', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2'];
  const NUMERO_ASCII = /^-?\d+(\.\d+)?$/;
  for (const idioma of IDIOMAS) {
    const svg = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, idioma);
    for (const attr of ATRIBUTOS_ESCALARES) {
      for (const m of svg.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, 'g'))) {
        assert.ok(!m[1]!.includes(','), `[${idioma}] atributo ${attr}="${m[1]}" tiene una coma — ¿se usó num() en vez de coord()?`);
      }
    }
    // "points" sí lleva comas legítimas como separador de par X,Y — cada mitad del
    // par tiene que ser un número ASCII válido (punto decimal, nunca coma).
    for (const m of svg.matchAll(/\spoints="([^"]*)"/g)) {
      for (const par of m[1]!.trim().split(/\s+/)) {
        const [x, y] = par.split(',');
        assert.ok(x !== undefined && y !== undefined && NUMERO_ASCII.test(x) && NUMERO_ASCII.test(y), `[${idioma}] par de "points" inválido: "${par}"`);
      }
    }
    const viewBox = svg.match(/viewBox="([^"]*)"/)?.[1];
    assert.ok(viewBox && !viewBox.includes(','), `[${idioma}] viewBox no debería tener comas`);
  }
});

test('los <text> de dimensiones, muros y distancias de reflexión usan num() por locale — coma en español, punto en inglés', () => {
  const disp = calcularDisposicion(SALA_VECTOR);

  const svgEs = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'es');
  assert.match(svgEs, />3,6 m</); // ancho
  assert.match(svgEs, />5,0 m</); // largo
  assert.match(svgEs, />2,40 m</); // alto
  assert.match(svgEs, />FRONTAL</);
  assert.match(svgEs, />POSTERIOR</);
  assert.match(svgEs, />IZQUIERDO</);
  assert.match(svgEs, />DERECHO</);
  assert.match(svgEs, />punto dulce</);
  assert.match(svgEs, /\d,\d\d m<\/text>.*fill="#C7AD7C"/s); // alguna distancia de reflexión con coma

  const svgEn = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'en');
  assert.match(svgEn, />3\.6 m</);
  assert.match(svgEn, />5\.0 m</);
  assert.match(svgEn, />2\.40 m</);
  assert.match(svgEn, />FRONT</);
  assert.match(svgEn, />REAR</);
  assert.match(svgEn, />LEFT</);
  assert.match(svgEn, />RIGHT</);
  assert.match(svgEn, />sweet spot</);
});

test('muro declarado "vacío" muestra el sufijo de abertura junto a su etiqueta', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const conAbertura: MurosVista = { ...MUROS_TIPICOS, frontal: 'vacio' };
  const svgEs = construirPlanoSvg(SALA_VECTOR, disp, conAbertura, 'es');
  assert.match(svgEs, />FRONTAL \(abierto\)</);
  const svgEn = construirPlanoSvg(SALA_VECTOR, disp, conAbertura, 'en');
  assert.match(svgEn, />FRONT \(open\)</);
});
