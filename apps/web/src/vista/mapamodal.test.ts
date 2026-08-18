import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarModos, paresMasImportantes } from '../../../../packages/engine/src/modos.ts';
import type { ModoAxial, ModoAgrupado } from '../../../../packages/engine/src/modos.ts';
import type { Sala } from '../../../../packages/engine/src/sala.ts';
import { ALTURA_ESCUCHA_M } from '../../../../packages/engine/src/sala.ts';
import { proyeccionSuperior } from './proyeccion.ts';
import { intensidadModoEn, intensidadParEn, intensidadCombinadaEn, colorDeIntensidad, construirMapaModalSvg } from './mapamodal.ts';

const SALA_CON_AGRUPAMIENTO: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // motor-mvp.md sección 4bis
const SALA_SIN_AGRUPAMIENTO: Sala = { anchoM: 2.5, largoM: 3.0, altoM: 2.2 };

test('intensidadModoEn: eje ancho depende de x, no de y', () => {
  const modo: ModoAxial = { eje: 'ancho', orden: 1, frecuenciaHz: 47.6 };
  // Antinodo en x=0 (borde), nodo en x=anchoM/2 (centro) para orden 1.
  const enBorde = intensidadModoEn(modo, SALA_CON_AGRUPAMIENTO, { x: 0, y: 1.5 });
  const enCentro = intensidadModoEn(modo, SALA_CON_AGRUPAMIENTO, { x: SALA_CON_AGRUPAMIENTO.anchoM / 2, y: 1.5 });
  assert.ok(Math.abs(enBorde - 1) < 1e-9, `esperaba antinodo (≈1) en el borde, dio ${enBorde}`);
  assert.ok(Math.abs(enCentro - 0) < 1e-9, `esperaba nodo (≈0) en el centro, dio ${enCentro}`);
  // Cambiar "y" con el mismo "x" no debería cambiar nada — el modo es del eje ancho.
  const otroY = intensidadModoEn(modo, SALA_CON_AGRUPAMIENTO, { x: 0, y: 4.9 });
  assert.equal(otroY, enBorde);
});

test('intensidadModoEn: eje largo depende de y, no de x (mismo principio, otro eje)', () => {
  const modo: ModoAxial = { eje: 'largo', orden: 1, frecuenciaHz: 34.3 };
  const enBorde = intensidadModoEn(modo, SALA_CON_AGRUPAMIENTO, { x: 1.8, y: 0 });
  const enCentro = intensidadModoEn(modo, SALA_CON_AGRUPAMIENTO, { x: 1.8, y: SALA_CON_AGRUPAMIENTO.largoM / 2 });
  assert.ok(Math.abs(enBorde - 1) < 1e-9);
  assert.ok(Math.abs(enCentro - 0) < 1e-9);
});

test('intensidadModoEn: eje alto es constante en el plano — no depende del punto, sólo de ALTURA_ESCUCHA_M', () => {
  const modo: ModoAxial = { eje: 'alto', orden: 1, frecuenciaHz: 71.46 };
  const a = intensidadModoEn(modo, SALA_CON_AGRUPAMIENTO, { x: 0.1, y: 0.2 });
  const b = intensidadModoEn(modo, SALA_CON_AGRUPAMIENTO, { x: 3.5, y: 4.9 });
  assert.equal(a, b);
  // Verificación directa contra la fórmula, evaluada en ALTURA_ESCUCHA_M.
  const esperado = Math.cos((modo.orden * Math.PI * ALTURA_ESCUCHA_M) / SALA_CON_AGRUPAMIENTO.altoM) ** 2;
  assert.ok(Math.abs(a - esperado) < 1e-12);
});

test('intensidadParEn: usa "min", no promedio — un modo en nodo domina aunque el otro esté en antinodo', () => {
  // modoA en su antinodo (x=0, orden 1), modoB en su nodo (y=largoM/2, orden 1) en el mismo punto (0, largoM/2).
  const modoA: ModoAxial = { eje: 'ancho', orden: 1, frecuenciaHz: 47.6 };
  const modoB: ModoAxial = { eje: 'largo', orden: 1, frecuenciaHz: 34.3 };
  const par: ModoAgrupado = { modoA, modoB, diferenciaHz: 13.3 };
  const punto = { x: 0, y: SALA_CON_AGRUPAMIENTO.largoM / 2 };
  const v = intensidadParEn(par, SALA_CON_AGRUPAMIENTO, punto);
  assert.ok(Math.abs(v - 0) < 1e-9, `esperaba que el nodo de modoB domine (≈0), dio ${v} — ¿se está promediando en vez de tomar el mínimo?`);
});

test('intensidadCombinadaEn: gana el par más alejado de 0,5, no el promedio de los pares', () => {
  // Par 1 en un punto donde da ≈0 (rojo); par 2, mismo punto, da ≈1 (verde).
  // Si se promediara: ≈0,5 (amarillo) — ocultaría el problema real del par 1.
  const modoAncho1: ModoAxial = { eje: 'ancho', orden: 1, frecuenciaHz: 47.6 };
  const modoLargo1: ModoAxial = { eje: 'largo', orden: 1, frecuenciaHz: 34.3 };
  // par1: ambos modos en su nodo en (anchoM/2, largoM/2) → intensidadParEn ≈ 0
  const par1: ModoAgrupado = { modoA: modoAncho1, modoB: modoLargo1, diferenciaHz: 13.3 };
  // par2: modo sintético de eje alto con orden 0 (cos(0)=1 exacto, constante en toda
  // la sala) — sólo para aislar la regla de combinación entre pares en este test;
  // evaluarModos() nunca produce orden 0 (no es un modo real), pero intensidadModoEn
  // es una función pura que no necesita pasar por ahí para este propósito.
  const modoAltoSintetico: ModoAxial = { eje: 'alto', orden: 0, frecuenciaHz: 0 };
  const par2: ModoAgrupado = { modoA: modoAltoSintetico, modoB: modoAltoSintetico, diferenciaHz: 0 };
  const punto = { x: SALA_CON_AGRUPAMIENTO.anchoM / 2, y: SALA_CON_AGRUPAMIENTO.largoM / 2 };

  const v1 = intensidadParEn(par1, SALA_CON_AGRUPAMIENTO, punto);
  const v2 = intensidadParEn(par2, SALA_CON_AGRUPAMIENTO, punto);
  assert.ok(Math.abs(v1 - 0) < 1e-9, `par1 debería dar ≈0, dio ${v1}`);
  assert.ok(Math.abs(v2 - 1) < 1e-9, `par2 debería dar ≈1, dio ${v2}`);

  const combinada = intensidadCombinadaEn(punto, SALA_CON_AGRUPAMIENTO, [par1, par2]);
  // "Más extremo gana": |0-0,5|=0,5 y |1-0,5|=0,5 — empate exacto, gana el más bajo (rojo).
  assert.ok(Math.abs(combinada - v1) < 1e-9, `esperaba que ganara el valor más bajo en el empate (${v1}), dio ${combinada}`);
  assert.notEqual(combinada, (v1 + v2) / 2, 'no debería ser el promedio de los dos pares');
});

test('intensidadCombinadaEn: con un solo par, funciona igual que intensidadParEn de ese par', () => {
  const modoA: ModoAxial = { eje: 'ancho', orden: 2, frecuenciaHz: 95.3 };
  const modoB: ModoAxial = { eje: 'largo', orden: 3, frecuenciaHz: 102.9 };
  const par: ModoAgrupado = { modoA, modoB, diferenciaHz: 7.6 };
  const punto = { x: 0.9, y: 1.7 };
  assert.equal(intensidadCombinadaEn(punto, SALA_CON_AGRUPAMIENTO, [par]), intensidadParEn(par, SALA_CON_AGRUPAMIENTO, punto));
});

test('intensidadCombinadaEn: lista de pares vacía da 0,5 (equilibrio) por definición', () => {
  assert.equal(intensidadCombinadaEn({ x: 1, y: 1 }, SALA_CON_AGRUPAMIENTO, []), 0.5);
});

test('colorDeIntensidad: los 3 extremos dan exactamente los mismos hex que --alert/--warn/--ok de estilos.css', () => {
  assert.equal(colorDeIntensidad(0), '#c58474'); // mismo hex que --alert
  assert.equal(colorDeIntensidad(0.5), '#c7ad7c'); // mismo hex que --warn
  assert.equal(colorDeIntensidad(1), '#96b6a2'); // mismo hex que --ok
});

test('colorDeIntensidad: acota valores fuera de [0,1] a los extremos', () => {
  assert.equal(colorDeIntensidad(-5), colorDeIntensidad(0));
  assert.equal(colorDeIntensidad(5), colorDeIntensidad(1));
});

test('construirMapaModalSvg: sala sin agrupamiento real da string vacío', () => {
  const r = evaluarModos(SALA_SIN_AGRUPAMIENTO);
  assert.equal(r.agrupados.length, 0);
  assert.equal(construirMapaModalSvg(SALA_SIN_AGRUPAMIENTO, r.agrupados), '');
});

test('construirMapaModalSvg: agrupados=[] da string vacío', () => {
  assert.equal(construirMapaModalSvg(SALA_CON_AGRUPAMIENTO, []), '');
});

test('construirMapaModalSvg: sala con agrupamiento produce una grilla de <rect>, todas dentro de la caja proyectada', () => {
  const r = evaluarModos(SALA_CON_AGRUPAMIENTO);
  assert.ok(paresMasImportantes(r.agrupados).length > 0);
  const svg = construirMapaModalSvg(SALA_CON_AGRUPAMIENTO, r.agrupados);
  assert.ok(svg.length > 0);

  const rects = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)];
  assert.ok(rects.length >= 12 * 30, `esperaba una grilla de al menos 12×30 celdas, hubo ${rects.length}`);

  const { pad, scale } = proyeccionSuperior(SALA_CON_AGRUPAMIENTO);
  const maxX = pad + SALA_CON_AGRUPAMIENTO.anchoM * scale;
  const maxY = pad + SALA_CON_AGRUPAMIENTO.largoM * scale;
  for (const m of rects) {
    const x = Number(m[1]);
    const y = Number(m[2]);
    const w = Number(m[3]);
    const h = Number(m[4]);
    assert.ok(x >= pad - 0.01 && x + w <= maxX + 0.01, `celda fuera de la caja en x: ${x}..${x + w}`);
    assert.ok(y >= pad - 0.01 && y + h <= maxY + 0.01, `celda fuera de la caja en y: ${y}..${y + h}`);
  }
});

test('construirMapaModalSvg: todas las celdas llevan fill-opacity parcial (capa de fondo, no debe tapar el wireframe)', () => {
  const r = evaluarModos(SALA_CON_AGRUPAMIENTO);
  const svg = construirMapaModalSvg(SALA_CON_AGRUPAMIENTO, r.agrupados);
  const opacidades = [...svg.matchAll(/fill-opacity="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.ok(opacidades.length > 0);
  for (const o of opacidades) assert.ok(o > 0 && o < 1, `fill-opacity debería ser parcial, fue ${o}`);
});

test('construirMapaModalSvg: coordenadas siempre con punto ASCII (nunca coma) — no toma idioma, es geometría', () => {
  const r = evaluarModos(SALA_CON_AGRUPAMIENTO);
  const svg = construirMapaModalSvg(SALA_CON_AGRUPAMIENTO, r.agrupados);
  assert.ok(!/,\d/.test(svg.replace(/fill="#[0-9a-f]+"/g, '')), 'coordenada con coma decimal encontrada');
});
