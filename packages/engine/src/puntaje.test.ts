import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPuntaje, peorSeveridad, PESOS_DECLARADOS, clasificarPuntaje, UMBRAL_PUNTAJE_VERDE, UMBRAL_PUNTAJE_NARANJO } from './puntaje.ts';
import type { ComponentePuntaje } from './puntaje.ts';

test('PESOS_DECLARADOS suma 1 (criterio editorial completo, ningún componente pesa "de más" por error de redondeo)', () => {
  const suma = Object.values(PESOS_DECLARADOS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(suma - 1) < 0.001, `suma=${suma}`);
});

test('peorSeveridad — alert le gana a warn y a ok', () => {
  assert.equal(peorSeveridad('ok', 'warn', 'alert'), 'alert');
  assert.equal(peorSeveridad('alert', 'ok'), 'alert');
});

test('peorSeveridad — warn le gana a ok si no hay alert', () => {
  assert.equal(peorSeveridad('ok', 'warn'), 'warn');
});

test('peorSeveridad — un solo valor se devuelve igual', () => {
  assert.equal(peorSeveridad('ok'), 'ok');
});

test('peorSeveridad — sin argumentos tira error en vez de devolver algo arbitrario', () => {
  assert.throws(() => peorSeveridad());
});

const BASE_OK: ComponentePuntaje[] = [
  { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
  { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'ok' },
  { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'ok' },
  { nombre: 'reverberacion', peso: PESOS_DECLARADOS.reverberacion, severidad: 'ok' },
];
const FUENTE_STREAMER_OK: ComponentePuntaje[] = [
  { nombre: 'puenteStreamer', peso: PESOS_DECLARADOS.puenteStreamer, severidad: 'ok' },
  { nombre: 'recorridoStreamer', peso: PESOS_DECLARADOS.recorridoStreamer, severidad: 'ok' },
];
const FUENTE_DAC_OK: ComponentePuntaje[] = [
  { nombre: 'puenteDac', peso: PESOS_DECLARADOS.puenteDac, severidad: 'ok' },
  { nombre: 'recorridoDac', peso: PESOS_DECLARADOS.recorridoDac, severidad: 'ok' },
];

test('calcularPuntaje — sin streamer ni dac: sólo los 4 componentes base, todos "ok" → 10, total variable en 4', () => {
  const r = calcularPuntaje(BASE_OK);
  assert.equal(r.puntaje, 10);
  assert.equal(r.componentesEvaluados, 4);
  assert.equal(r.componentesTotales, 4);
});

test('calcularPuntaje — con una sola fuente elegida (streamer): 6 componentes, total variable en 6', () => {
  const r = calcularPuntaje([...BASE_OK, ...FUENTE_STREAMER_OK]);
  assert.equal(r.puntaje, 10);
  assert.equal(r.componentesEvaluados, 6);
  assert.equal(r.componentesTotales, 6);
});

test('calcularPuntaje — con streamer y dac elegidos a la vez: los 8 componentes, todos "ok" → 10, total variable en 8', () => {
  const r = calcularPuntaje([...BASE_OK, ...FUENTE_STREAMER_OK, ...FUENTE_DAC_OK]);
  assert.equal(r.puntaje, 10);
  assert.equal(r.componentesEvaluados, 8);
  assert.equal(r.componentesTotales, 8);
});

test('calcularPuntaje — streamer y dac por separado: un problema en el puente del streamer no le baja la nota al puente del dac', () => {
  const componentes: ComponentePuntaje[] = [
    ...BASE_OK,
    { nombre: 'puenteStreamer', peso: PESOS_DECLARADOS.puenteStreamer, severidad: 'alert' },
    { nombre: 'recorridoStreamer', peso: PESOS_DECLARADOS.recorridoStreamer, severidad: 'ok' },
    { nombre: 'puenteDac', peso: PESOS_DECLARADOS.puenteDac, severidad: 'ok' },
    { nombre: 'recorridoDac', peso: PESOS_DECLARADOS.recorridoDac, severidad: 'ok' },
  ];
  const r = calcularPuntaje(componentes);
  const puenteStreamer = r.detalle.find((d) => d.nombre === 'puenteStreamer')!;
  const puenteDac = r.detalle.find((d) => d.nombre === 'puenteDac')!;
  assert.equal(puenteStreamer.puntos, 0); // alert
  assert.equal(puenteDac.puntos, 10); // ok — no se contagia del streamer, a diferencia del peorSeveridad() combinado de antes
});

test('calcularPuntaje — los 8 componentes en "alert" dan puntaje 1,0, nunca 0 (escala declarada 1-10)', () => {
  const componentes: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'alert' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'alert' },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'alert' },
    { nombre: 'reverberacion', peso: PESOS_DECLARADOS.reverberacion, severidad: 'alert' },
    { nombre: 'puenteStreamer', peso: PESOS_DECLARADOS.puenteStreamer, severidad: 'alert' },
    { nombre: 'recorridoStreamer', peso: PESOS_DECLARADOS.recorridoStreamer, severidad: 'alert' },
    { nombre: 'puenteDac', peso: PESOS_DECLARADOS.puenteDac, severidad: 'alert' },
    { nombre: 'recorridoDac', peso: PESOS_DECLARADOS.recorridoDac, severidad: 'alert' },
  ];
  const r = calcularPuntaje(componentes);
  assert.equal(r.puntaje, 1);
});

test('calcularPuntaje — renormaliza sobre lo incluido cuando algo queda "sin-datos" (caso base, sin fuentes)', () => {
  const componentes: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'sin-datos' },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'warn' },
    { nombre: 'reverberacion', peso: PESOS_DECLARADOS.reverberacion, severidad: 'ok' },
  ];
  const r = calcularPuntaje(componentes);
  assert.equal(r.componentesEvaluados, 3);
  assert.equal(r.componentesTotales, 4);
  // (0,24*10 + 0,10*5 + 0,10*10) / (0,24+0,10+0,10) = 3,9/0,44 ≈ 8,8636 → redondea a 8,9
  assert.equal(r.puntaje, 8.9);
});

test('calcularPuntaje — "sin-datos" se excluye igual que null (dato faltante nunca cuenta como "ok" ni penaliza)', () => {
  const conSinDatos: ComponentePuntaje[] = [
    ...BASE_OK,
    { nombre: 'puenteStreamer', peso: PESOS_DECLARADOS.puenteStreamer, severidad: 'sin-datos' },
    { nombre: 'recorridoStreamer', peso: PESOS_DECLARADOS.recorridoStreamer, severidad: 'ok' },
  ];
  const conNull: ComponentePuntaje[] = conSinDatos.map((c) => (c.nombre === 'puenteStreamer' ? { ...c, severidad: null } : c));
  assert.deepEqual(calcularPuntaje(conSinDatos), calcularPuntaje(conNull));
});

test('calcularPuntaje — detalle marca incluido:false y puntos:null para lo excluido', () => {
  const componentes: ComponentePuntaje[] = [
    ...BASE_OK,
    { nombre: 'puenteStreamer', peso: PESOS_DECLARADOS.puenteStreamer, severidad: null },
    { nombre: 'recorridoStreamer', peso: PESOS_DECLARADOS.recorridoStreamer, severidad: null },
  ];
  const r = calcularPuntaje(componentes);
  const puente = r.detalle.find((d) => d.nombre === 'puenteStreamer')!;
  assert.equal(puente.incluido, false);
  assert.equal(puente.puntos, null);
  const potencia = r.detalle.find((d) => d.nombre === 'potencia')!;
  assert.equal(potencia.incluido, true);
  assert.equal(potencia.puntos, 10);
});

test('calcularPuntaje — mezcla realista con los 8 componentes: valor decimal exacto', () => {
  const componentes: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'warn' },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'warn' },
    { nombre: 'reverberacion', peso: PESOS_DECLARADOS.reverberacion, severidad: 'ok' },
    { nombre: 'puenteStreamer', peso: PESOS_DECLARADOS.puenteStreamer, severidad: 'ok' },
    { nombre: 'recorridoStreamer', peso: PESOS_DECLARADOS.recorridoStreamer, severidad: 'warn' },
    { nombre: 'puenteDac', peso: PESOS_DECLARADOS.puenteDac, severidad: 'warn' },
    { nombre: 'recorridoDac', peso: PESOS_DECLARADOS.recorridoDac, severidad: 'ok' },
  ];
  const r = calcularPuntaje(componentes);
  // 0,24*10 + 0,20*5 + 0,10*5 + 0,10*10 + 0,10*10 + 0,08*5 + 0,10*5 + 0,08*10
  // = 2,4 + 1,0 + 0,5 + 1,0 + 1,0 + 0,4 + 0,5 + 0,8 = 7,6 (pesos suman 1, sin renormalizar)
  assert.equal(r.puntaje, 7.6);
  assert.equal(r.clase, 'warn'); // 7,6 está entre el umbral naranjo (5) y el verde (8)
});

// ---- clasificarPuntaje / umbrales de color, con decimales ----

test('clasificarPuntaje: por encima o igual al umbral verde → "ok"', () => {
  assert.equal(clasificarPuntaje(10), 'ok');
  assert.equal(clasificarPuntaje(UMBRAL_PUNTAJE_VERDE), 'ok');
  assert.equal(clasificarPuntaje(8.0), 'ok');
});

test('clasificarPuntaje: entre el umbral naranjo y el verde → "warn", incluido el borde decimal justo debajo de 8', () => {
  assert.equal(clasificarPuntaje(UMBRAL_PUNTAJE_VERDE - 1), 'warn');
  assert.equal(clasificarPuntaje(UMBRAL_PUNTAJE_NARANJO), 'warn');
  assert.equal(clasificarPuntaje(7.9), 'warn');
  assert.equal(clasificarPuntaje(5.0), 'warn');
});

test('clasificarPuntaje: por debajo del umbral naranjo → "alert", incluido el borde decimal justo debajo de 5', () => {
  assert.equal(clasificarPuntaje(UMBRAL_PUNTAJE_NARANJO - 1), 'alert');
  assert.equal(clasificarPuntaje(1), 'alert');
  assert.equal(clasificarPuntaje(4.9), 'alert');
});

test('calcularPuntaje: todo "ok" da clase "ok" (verde); todo "alert" da clase "alert" (rojo)', () => {
  const todosOk: ComponentePuntaje[] = [...BASE_OK, ...FUENTE_STREAMER_OK, ...FUENTE_DAC_OK];
  assert.equal(calcularPuntaje(todosOk).clase, 'ok');

  const todosAlert: ComponentePuntaje[] = todosOk.map((c) => ({ ...c, severidad: 'alert' as const }));
  assert.equal(calcularPuntaje(todosAlert).clase, 'alert');
});
