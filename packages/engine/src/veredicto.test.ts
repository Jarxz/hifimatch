import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularVeredicto } from './veredicto.ts';
import type { EntradaVeredicto } from './veredicto.ts';

const BASE: EntradaVeredicto = {
  potencia: 'ok',
  carga: 'ok',
  amortiguamiento: 'sin-datos', // catálogo sin DF/impedanciaMaxOhm poblados todavía — mismo estado real de hoy
  puenteStreamer: null,
  recorridoStreamer: null,
  puenteDac: null,
  recorridoDac: null,
  modos: 'ok',
  reverberacion: 'sin-datos', // el RT60 estimado ya no emite veredicto — mismo estado real de hoy, ver reverberacion.ts
};

test('todo "ok"/"sin-datos" (estado real de hoy) → los 3 grupos "ok", general "ok"', () => {
  const v = calcularVeredicto(BASE);
  assert.deepEqual(v, { potencia: 'ok', acopleElectrico: 'ok', sala: 'ok', general: 'ok' });
});

test('acopleElectrico: sin streamer ni dac, sólo depende de carga', () => {
  const v = calcularVeredicto({ ...BASE, carga: 'warn' });
  assert.equal(v.acopleElectrico, 'warn');
  assert.equal(v.general, 'warn');
});

test('acopleElectrico: el peor de carga/puente/recorrido gana — no un promedio', () => {
  // carga "ok" pero el puente del streamer "alert" — el grupo entero es "alert", no se diluye
  const v = calcularVeredicto({ ...BASE, carga: 'ok', puenteStreamer: 'alert', recorridoStreamer: 'ok' });
  assert.equal(v.acopleElectrico, 'alert');
  assert.equal(v.general, 'alert');
});

test('acopleElectrico: streamer y dac elegidos a la vez — el peor de los 5 componentes aplicables gana', () => {
  const v = calcularVeredicto({
    ...BASE,
    carga: 'ok',
    puenteStreamer: 'ok',
    recorridoStreamer: 'ok',
    puenteDac: 'warn',
    recorridoDac: 'ok',
  });
  assert.equal(v.acopleElectrico, 'warn');
});

test('acopleElectrico: "sin-datos" de un componente se excluye, no cuenta como reparo', () => {
  const v = calcularVeredicto({ ...BASE, carga: 'sin-datos', puenteStreamer: 'ok', recorridoStreamer: 'ok' });
  assert.equal(v.acopleElectrico, 'ok'); // la carga sin dato no arrastra el grupo a "sin-datos" ni a "warn"
});

test('acopleElectrico: si TODO el grupo queda sin dato (carga sin-datos, sin streamer ni dac), el grupo es "sin-datos"', () => {
  const v = calcularVeredicto({ ...BASE, carga: 'sin-datos' });
  assert.equal(v.acopleElectrico, 'sin-datos');
});

test('general: "sin-datos" en acopleElectrico se excluye del cálculo general — nunca "tapa" un problema real en potencia/sala', () => {
  const v = calcularVeredicto({ ...BASE, carga: 'sin-datos', potencia: 'alert' });
  assert.equal(v.acopleElectrico, 'sin-datos');
  assert.equal(v.general, 'alert'); // sigue reflejando el problema real de potencia
});

test('sala: peor de modos/reverberación — nunca "alert" (techo de severidad de sala, ver CLAUDE.md)', () => {
  const v = calcularVeredicto({ ...BASE, modos: 'warn', reverberacion: 'ok' });
  assert.equal(v.sala, 'warn');
});

test('sala: reverberacion "sin-datos" (estado real de hoy — el RT60 estimado ya no emite veredicto) no arrastra el grupo, "sala" refleja sólo modos', () => {
  const v1 = calcularVeredicto({ ...BASE, modos: 'ok', reverberacion: 'sin-datos' });
  assert.equal(v1.sala, 'ok');
  const v2 = calcularVeredicto({ ...BASE, modos: 'warn', reverberacion: 'sin-datos' });
  assert.equal(v2.sala, 'warn');
});

test('sala: nunca es "sin-datos" — modos siempre tiene valor, aunque reverberacion sea "sin-datos" (su estado real de hoy)', () => {
  const v = calcularVeredicto(BASE);
  assert.notEqual(v.sala as string, 'sin-datos');
});

test('general: sala en "warn" alcanza para que el general sea "warn" aunque potencia/acople estén "ok"', () => {
  const v = calcularVeredicto({ ...BASE, modos: 'warn' });
  assert.equal(v.general, 'warn');
});

test('general: potencia "alert" domina sobre acople/sala "ok" — el peor eslabón manda', () => {
  const v = calcularVeredicto({ ...BASE, potencia: 'alert' });
  assert.equal(v.general, 'alert');
});

test('general nunca es "sin-datos": potencia y sala siempre tienen valor, incluso si acopleElectrico no', () => {
  const v = calcularVeredicto({ ...BASE, carga: 'sin-datos' });
  assert.notEqual(v.general, 'sin-datos');
});

test('acopleElectrico: amortiguamiento "alert" domina aunque carga/puente/recorrido estén "ok" — el peor eslabón sigue siendo cualquiera de los 6 componentes aplicables', () => {
  const v = calcularVeredicto({ ...BASE, amortiguamiento: 'alert' });
  assert.equal(v.acopleElectrico, 'alert');
  assert.equal(v.general, 'alert');
});

test('acopleElectrico: amortiguamiento "sin-datos" (catálogo sin DF poblado, estado real de hoy) no arrastra el grupo — mismo criterio que "sin-datos" en cualquier otro componente', () => {
  const v = calcularVeredicto({ ...BASE, carga: 'warn', amortiguamiento: 'sin-datos' });
  assert.equal(v.acopleElectrico, 'warn'); // sigue reflejando el problema real de carga, no se diluye ni se oculta
});
