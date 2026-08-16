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

test('calcularPuntaje — los 5 componentes en "ok" dan puntaje 10', () => {
  const componentes: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'ok' },
    { nombre: 'puente', peso: PESOS_DECLARADOS.puente, severidad: 'ok' },
    { nombre: 'recorrido', peso: PESOS_DECLARADOS.recorrido, severidad: 'ok' },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'ok' },
  ];
  const r = calcularPuntaje(componentes);
  assert.equal(r.puntaje, 10);
  assert.equal(r.componentesEvaluados, 5);
  assert.equal(r.componentesTotales, 5);
});

test('calcularPuntaje — los 5 componentes en "alert" dan puntaje 1, nunca 0 (escala declarada 1-10)', () => {
  const componentes: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'alert' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'alert' },
    { nombre: 'puente', peso: PESOS_DECLARADOS.puente, severidad: 'alert' },
    { nombre: 'recorrido', peso: PESOS_DECLARADOS.recorrido, severidad: 'alert' },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'warn' }, // modos nunca es "alert"
  ];
  const r = calcularPuntaje(componentes);
  assert.equal(r.puntaje, 1);
});

test('calcularPuntaje — sin streamer ni dac (puente/recorrido null): renormaliza sobre potencia+carga+modos', () => {
  const componentes: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'warn' },
    { nombre: 'puente', peso: PESOS_DECLARADOS.puente, severidad: null },
    { nombre: 'recorrido', peso: PESOS_DECLARADOS.recorrido, severidad: null },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'ok' },
  ];
  const r = calcularPuntaje(componentes);
  assert.equal(r.componentesEvaluados, 3);
  assert.equal(r.componentesTotales, 5);
  // (0,30*10 + 0,25*5 + 0,15*10) / (0,30+0,25+0,15) = 5,75/0,70 ≈ 8,21 → redondea a 8
  assert.equal(r.puntaje, 8);
});

test('calcularPuntaje — "sin-datos" se excluye igual que null (dato faltante nunca cuenta como "ok" ni penaliza)', () => {
  const conSinDatos: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'sin-datos' },
    { nombre: 'puente', peso: PESOS_DECLARADOS.puente, severidad: null },
    { nombre: 'recorrido', peso: PESOS_DECLARADOS.recorrido, severidad: null },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'ok' },
  ];
  const conNull: ComponentePuntaje[] = conSinDatos.map((c) => (c.nombre === 'carga' ? { ...c, severidad: null } : c));
  assert.deepEqual(calcularPuntaje(conSinDatos), calcularPuntaje(conNull));
});

test('calcularPuntaje — detalle marca incluido:false y puntos:null para lo excluido', () => {
  const componentes: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'ok' },
    { nombre: 'puente', peso: PESOS_DECLARADOS.puente, severidad: null },
    { nombre: 'recorrido', peso: PESOS_DECLARADOS.recorrido, severidad: null },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'ok' },
  ];
  const r = calcularPuntaje(componentes);
  const puente = r.detalle.find((d) => d.nombre === 'puente')!;
  assert.equal(puente.incluido, false);
  assert.equal(puente.puntos, null);
  const potencia = r.detalle.find((d) => d.nombre === 'potencia')!;
  assert.equal(potencia.incluido, true);
  assert.equal(potencia.puntos, 10);
});

test('calcularPuntaje — mezcla realista: potencia ok, carga warn, puente ok, recorrido warn, modos warn', () => {
  const componentes: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'warn' },
    { nombre: 'puente', peso: PESOS_DECLARADOS.puente, severidad: 'ok' },
    { nombre: 'recorrido', peso: PESOS_DECLARADOS.recorrido, severidad: 'warn' },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'warn' },
  ];
  const r = calcularPuntaje(componentes);
  // (0,30*10 + 0,25*5 + 0,17*10 + 0,13*5 + 0,15*5) / 1 = 3+1,25+1,7+0,65+0,75 = 7,35 → redondea a 7
  assert.equal(r.puntaje, 7);
  assert.equal(r.clase, 'warn'); // 7 está entre el umbral naranjo (5) y el verde (8)
});

// ---- clasificarPuntaje / umbrales de color ----

test('clasificarPuntaje: por encima o igual al umbral verde → "ok"', () => {
  assert.equal(clasificarPuntaje(10), 'ok');
  assert.equal(clasificarPuntaje(UMBRAL_PUNTAJE_VERDE), 'ok');
});

test('clasificarPuntaje: entre el umbral naranjo y el verde → "warn"', () => {
  assert.equal(clasificarPuntaje(UMBRAL_PUNTAJE_VERDE - 1), 'warn');
  assert.equal(clasificarPuntaje(UMBRAL_PUNTAJE_NARANJO), 'warn');
});

test('clasificarPuntaje: por debajo del umbral naranjo → "alert"', () => {
  assert.equal(clasificarPuntaje(UMBRAL_PUNTAJE_NARANJO - 1), 'alert');
  assert.equal(clasificarPuntaje(1), 'alert');
});

test('calcularPuntaje: todo "ok" da clase "ok" (verde); todo "alert" da clase "alert" (rojo)', () => {
  const todosOk: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'ok' },
    { nombre: 'puente', peso: PESOS_DECLARADOS.puente, severidad: 'ok' },
    { nombre: 'recorrido', peso: PESOS_DECLARADOS.recorrido, severidad: 'ok' },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'ok' },
  ];
  assert.equal(calcularPuntaje(todosOk).clase, 'ok');

  const todosAlert: ComponentePuntaje[] = todosOk.map((c) => ({ ...c, severidad: 'alert' as const }));
  assert.equal(calcularPuntaje(todosAlert).clase, 'alert');
});
