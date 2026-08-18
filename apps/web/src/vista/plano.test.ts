import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDisposicion } from '../../../../packages/engine/src/sala.ts';
import type { Sala } from '../../../../packages/engine/src/sala.ts';
import { evaluarModos } from '../../../../packages/engine/src/modos.ts';
import type { Idioma } from '../../../../packages/data/src/idioma.ts';
import { construirPlanoSvg, proyeccionSuperior } from './plano.ts';
import type { MurosVista, Vista } from './plano.ts';

const SALA_VECTOR: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // motor-mvp.md sección 4
const IDIOMAS: readonly Idioma[] = ['es', 'en'];
const VISTAS: readonly Vista[] = ['isometrica', 'frontal', 'lateral', 'superior'];
const MUROS_TIPICOS: MurosVista = { frontal: 'yesoCarton', posterior: 'yesoCarton', izquierdo: 'madera', derecho: 'madera' };

test('vector de motor-mvp.md sección 4 (W=3,6, L=5,0): el SVG isométrico generado está bien formado, en cualquier idioma', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  for (const idioma of IDIOMAS) {
    const svg = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'isometrica', idioma);
    assert.match(svg, /^<svg viewBox="0 0 \d+ \d+"/, idioma);
    assert.match(svg, /<\/svg>$/, idioma);
    assert.equal((svg.match(/<rect/g) ?? []).length, 0, idioma); // sin <rect>: sala y parlantes son wireframe
    // sin muros "vacío": 8 reflexiones (lateral×2, trasera×2, techo×2, piso×2) + anillo del punto dulce + punto dulce
    assert.equal((svg.match(/<circle/g) ?? []).length, 10, idioma);
    // cubo de alambre (12 aristas) + triángulo de escucha (2) + 4 verticales por caja de parlante × 2 parlantes (8)
    assert.equal((svg.match(/<line/g) ?? []).length, 22, idioma);
    // piso (relleno) + 8 caminos de reflexión + 2 caras (arriba/abajo) por caja de parlante × 2 parlantes (4)
    assert.equal((svg.match(/<polyline/g) ?? []).length, 13, idioma);
  }
});

test('las 4 vistas (isométrica/frontal/lateral/superior) producen un SVG válido con la misma cantidad de elementos', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  for (const vista of VISTAS) {
    const svg = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, vista, 'es');
    assert.match(svg, /^<svg viewBox="0 0 \d+ \d+"/, vista);
    assert.match(svg, /<\/svg>$/, vista);
    assert.equal((svg.match(/<circle/g) ?? []).length, 10, vista);
    assert.equal((svg.match(/<line/g) ?? []).length, 22, vista);
    assert.equal((svg.match(/<polyline/g) ?? []).length, 13, vista);
  }
});

test('las 4 vistas dan proyecciones distintas (no son el mismo dibujo con otro nombre)', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const svgs = VISTAS.map((vista) => construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, vista, 'es'));
  const unicos = new Set(svgs);
  assert.equal(unicos.size, VISTAS.length, 'cada vista debería producir un SVG distinto');
});

test('muro "vacío" no dibuja su reflexión: menos círculos y polylines que con todos los muros sólidos', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const conAbertura: MurosVista = { ...MUROS_TIPICOS, izquierdo: 'vacio' };
  const svgTipico = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'isometrica', 'es');
  const svgAbierto = construirPlanoSvg(SALA_VECTOR, disp, conAbertura, 'isometrica', 'es');
  // se pierde 1 reflexión (lateral izquierda): 10→9 círculos, 13→12 polylines
  assert.equal((svgAbierto.match(/<circle/g) ?? []).length, (svgTipico.match(/<circle/g) ?? []).length - 1);
  assert.equal((svgAbierto.match(/<polyline/g) ?? []).length, (svgTipico.match(/<polyline/g) ?? []).length - 1);
  // el cubo de alambre y las cajas de parlante no cambian: sigue siendo la misma caja rígida
  assert.equal((svgAbierto.match(/<line/g) ?? []).length, (svgTipico.match(/<line/g) ?? []).length);
});

test('muro posterior "vacío" quita las DOS reflexiones traseras (izq y der comparten el mismo muro)', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const conAberturaTrasera: MurosVista = { ...MUROS_TIPICOS, posterior: 'vacio' };
  const svgTipico = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'isometrica', 'es');
  const svgAbierto = construirPlanoSvg(SALA_VECTOR, disp, conAberturaTrasera, 'isometrica', 'es');
  assert.equal((svgAbierto.match(/<circle/g) ?? []).length, (svgTipico.match(/<circle/g) ?? []).length - 2);
});

test('coordenadas geométricas: nunca coma decimal en NINGÚN idioma (un atributo "x=81,4" es inválido y el navegador lo descarta)', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const ATRIBUTOS_ESCALARES = ['x', 'y', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2'];
  const NUMERO_ASCII = /^-?\d+(\.\d+)?$/;
  for (const idioma of IDIOMAS) {
    const svg = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'isometrica', idioma);
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

  const svgEs = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'isometrica', 'es');
  assert.match(svgEs, />3,6 m</); // ancho
  assert.match(svgEs, />5,0 m</); // largo
  assert.match(svgEs, />2,40 m</); // alto
  assert.match(svgEs, />FRONTAL</);
  assert.match(svgEs, />POSTERIOR</);
  assert.match(svgEs, />IZQUIERDO</);
  assert.match(svgEs, />DERECHO</);
  assert.match(svgEs, />punto dulce</);
  assert.match(svgEs, /\d,\d\d m<\/text>.*fill="#C7AD7C"/s); // alguna distancia de reflexión con coma

  const svgEn = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'isometrica', 'en');
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
  const svgEs = construirPlanoSvg(SALA_VECTOR, disp, conAbertura, 'isometrica', 'es');
  assert.match(svgEs, />FRONTAL \(abierto\)</);
  const svgEn = construirPlanoSvg(SALA_VECTOR, disp, conAbertura, 'isometrica', 'en');
  assert.match(svgEn, />FRONT \(open\)</);
});

// ---- editable (vista Superior arrastrable) y proyeccionSuperior ----

test('editable=false (u omitido) no cambia el SVG — mismo dibujo que antes de este parámetro', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const sinParametro = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'superior', 'es');
  const explicitoFalse = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'superior', 'es', false);
  assert.equal(sinParametro, explicitoFalse);
  assert.equal((sinParametro.match(/data-parlante=/g) ?? []).length, 0);
  assert.equal((sinParametro.match(/data-agarre=/g) ?? []).length, 0);
});

test('editable=true en vista Superior agrega un <g data-parlante> y un círculo de agarre invisible por parlante', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const svgFijo = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'superior', 'es', false);
  const svgEditable = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'superior', 'es', true);

  assert.match(svgEditable, /<g data-parlante="izq" class="parlante-arrastrable" style="touch-action:none">/);
  assert.match(svgEditable, /<g data-parlante="der" class="parlante-arrastrable" style="touch-action:none">/);
  assert.equal((svgEditable.match(/data-agarre="izq"/g) ?? []).length, 1);
  assert.equal((svgEditable.match(/data-agarre="der"/g) ?? []).length, 1);
  // el agarre invisible también declara touch-action:none directo (no sólo
  // heredado de la clase del <g>) — el compositor de touch de algunos
  // navegadores decide scroll-vs-gesto sobre la forma tocada, no sobre un
  // ancestro sin geometría propia.
  assert.match(svgEditable, /data-agarre="izq" style="touch-action:none"/);
  assert.match(svgEditable, /data-agarre="der" style="touch-action:none"/);
  // 2 círculos de agarre más que la versión fija, nada más cambia de forma
  assert.equal((svgEditable.match(/<circle/g) ?? []).length, (svgFijo.match(/<circle/g) ?? []).length + 2);
  assert.equal((svgEditable.match(/<line/g) ?? []).length, (svgFijo.match(/<line/g) ?? []).length);
  assert.equal((svgEditable.match(/<polyline/g) ?? []).length, (svgFijo.match(/<polyline/g) ?? []).length);
});

test('editable=true en una vista que no es Superior se ignora — sin agarres ni <g data-parlante>, geometría de arrastre no aplicaría ahí', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  for (const vista of ['isometrica', 'frontal', 'lateral'] as const) {
    const svgFijo = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, vista, 'es', false);
    const svgEditablePedido = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, vista, 'es', true);
    assert.equal(svgFijo, svgEditablePedido, vista);
  }
});

test('proyeccionSuperior: pad fijo, scale limitado por el eje que primero toca el borde del área de dibujo', () => {
  // W=3.6 domina poco (560/3.6≈155.6), L=5.0 con 460/5.0=92 es el más chico → gana el largo
  const p1 = proyeccionSuperior(SALA_VECTOR);
  assert.equal(p1.pad, 64);
  assert.ok(Math.abs(p1.scale - 92) < 0.01, `scale=${p1.scale}`);

  // sala angosta y muy larga: 460/10=46 sigue siendo más chico que 560/2=280 → gana el largo otra vez
  const p2 = proyeccionSuperior({ anchoM: 2.0, largoM: 10, altoM: 2.4 });
  assert.ok(Math.abs(p2.scale - 46) < 0.01, `scale=${p2.scale}`);

  // sala ancha y corta: acá sí gana el ancho (560/8=70 < 460/2.5=184)
  const p3 = proyeccionSuperior({ anchoM: 8, largoM: 2.5, altoM: 2.4 });
  assert.ok(Math.abs(p3.scale - 70) < 0.01, `scale=${p3.scale}`);
});

test('proyeccionSuperior alimenta exactamente el pad/scale que usa construirPlanoSvg en vista Superior (viewBox derivado del mismo scale)', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const { pad, scale } = proyeccionSuperior(SALA_VECTOR);
  const svg = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'superior', 'es');
  const sw = Math.round(SALA_VECTOR.anchoM * scale + pad * 2);
  const sh = Math.round(SALA_VECTOR.largoM * scale + pad * 2);
  const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  assert.ok(viewBox);
  assert.equal(Number(viewBox![1]), sw);
  assert.equal(Number(viewBox![2]), sh);
});

// ---- mapa de zonas modales (agrupados) ----

test('agrupados omitido o [] no cambia el SVG (ninguna vista) — mismo criterio que editable=false', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  for (const vista of VISTAS) {
    const sinParametro = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, vista, 'es');
    const vacioExplicito = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, vista, 'es', false, []);
    assert.equal(sinParametro, vacioExplicito, vista);
    assert.equal((sinParametro.match(/<rect /g) ?? []).length, 0, vista);
  }
});

test('agrupados no vacío en vista Superior agrega una grilla de <rect> — no hay <rect> en el resto del dibujo', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const r = evaluarModos(SALA_VECTOR); // sala con agrupamiento real, ver modos.test.ts
  assert.ok(r.agrupados.length > 0);

  const sinMapa = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'superior', 'es', false, []);
  const conMapa = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'superior', 'es', false, r.agrupados);
  assert.equal((sinMapa.match(/<rect /g) ?? []).length, 0);
  assert.ok((conMapa.match(/<rect /g) ?? []).length > 0);
  // nada más cambia de forma — mismo criterio que el test de "editable"
  assert.equal((conMapa.match(/<circle/g) ?? []).length, (sinMapa.match(/<circle/g) ?? []).length);
  assert.equal((conMapa.match(/<line/g) ?? []).length, (sinMapa.match(/<line/g) ?? []).length);
  assert.equal((conMapa.match(/<polyline/g) ?? []).length, (sinMapa.match(/<polyline/g) ?? []).length);
});

test('agrupados no vacío en una vista que no es Superior se ignora — sin <rect>, un plano de planta no aplica a una vista 3D/ortográfica lateral', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const r = evaluarModos(SALA_VECTOR);
  for (const vista of ['isometrica', 'frontal', 'lateral'] as const) {
    const svgFijo = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, vista, 'es', false, []);
    const svgConAgrupadosPedido = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, vista, 'es', false, r.agrupados);
    assert.equal(svgFijo, svgConAgrupadosPedido, vista);
  }
});

test('el mapa de zonas modales se dibuja ANTES del piso/cubo de alambre (capa de fondo) — su primer <rect> aparece antes que el primer <line>/<polyline>', () => {
  const disp = calcularDisposicion(SALA_VECTOR);
  const r = evaluarModos(SALA_VECTOR);
  const svg = construirPlanoSvg(SALA_VECTOR, disp, MUROS_TIPICOS, 'superior', 'es', false, r.agrupados);
  const idxRect = svg.indexOf('<rect ');
  const idxLine = svg.indexOf('<line ');
  const idxPoli = svg.indexOf('<polyline ');
  assert.ok(idxRect >= 0);
  assert.ok(idxRect < idxLine, 'el mapa modal debería pintarse antes que el cubo de alambre');
  assert.ok(idxRect < idxPoli, 'el mapa modal debería pintarse antes que el piso');
});
