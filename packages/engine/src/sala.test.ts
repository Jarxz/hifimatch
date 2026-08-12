import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDisposicion } from './sala.ts';

const EPS = 0.005; // más fino que la tolerancia de dB: acá son metros

test('vector de motor-mvp.md sección 4 — W=3.6, L=5.0', () => {
  const d = calcularDisposicion({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });

  assert.ok(Math.abs(d.centroXM - 1.8) < EPS);
  assert.ok(Math.abs(d.separacionM - 1.98) < EPS);
  assert.ok(Math.abs(d.offsetFrenteM - 0.75) < EPS);
  assert.ok(Math.abs(d.filaEscuchaM - 3.126) < EPS);
  assert.ok(Math.abs(d.parlanteIzq.x - 0.81) < EPS);
  assert.ok(Math.abs(d.parlanteDer.x - 2.79) < EPS);
  assert.ok(Math.abs(d.distanciaEscuchaM - 2.574) < EPS);
  assert.ok(Math.abs(d.reflexionIzq.y - 1.487) < EPS);
  assert.ok(Math.abs(d.reflexionIzq.x - 0) < EPS);
  assert.ok(Math.abs(d.reflexionDer.x - 3.6) < EPS);
  assert.ok(Math.abs(d.reflexionDer.y - 1.487) < EPS);
  assert.ok(Math.abs(d.puntoDulce.x - 1.8) < EPS);
  assert.ok(Math.abs(d.puntoDulce.y - 3.126) < EPS);
});

test('distanciaEscuchaM alimenta directamente a la regla de potencia (mismo dato, no se recalcula)', () => {
  const d = calcularDisposicion({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  assert.equal(typeof d.distanciaEscuchaM, 'number');
  assert.ok(d.distanciaEscuchaM > 0);
});

test('separación de parlantes respeta el piso de 1,5 m en salas muy angostas', () => {
  // W=2.5 (el mínimo del slider del prototipo): 0.55*2.5=1.375 < 1.5 → clamp al piso
  const d = calcularDisposicion({ anchoM: 2.5, largoM: 5.0, altoM: 2.4 });
  assert.ok(Math.abs(d.separacionM - 1.5) < EPS);
});

test('separación de parlantes respeta el techo de 3,0 m en salas muy anchas', () => {
  // W=7 (el máximo del slider): 0.55*7=3.85, min(3.0, 7-1)=3.0 → clamp al techo
  const d = calcularDisposicion({ anchoM: 7, largoM: 9, altoM: 2.4 });
  assert.ok(Math.abs(d.separacionM - 3.0) < EPS);
});

test('volumen = ancho × largo × alto', () => {
  const d = calcularDisposicion({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  assert.ok(Math.abs(d.volumenM3 - 43.2) < EPS);
});
