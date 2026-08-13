import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  atenuacionPorDistanciaDb,
  gananciaPorPotenciaDb,
  sumarNivelesDb,
  sensibilidadA1WDb,
  frecuenciaModoAxialHz,
} from './unidades.ts';

// Tolerancia estándar del proyecto: ±0,05 dB (ver docs/motor-mvp.md, cabecera).
const EPS = 0.05;

test('atenuacionPorDistanciaDb — vectores de motor-mvp.md sección 2', () => {
  // Vector A: "86 − 7,959 + ..." a dist=2.5
  assert.ok(Math.abs(atenuacionPorDistanciaDb(2.5) - 7.959) < EPS);
  // Vector B/C: "85 − 9,542 + ..." a dist=3.0
  assert.ok(Math.abs(atenuacionPorDistanciaDb(3.0) - 9.542) < EPS);
});

test('atenuacionPorDistanciaDb — caso trivial a 1 m', () => {
  // 20·log10(1) = 0: a un metro no hay atenuación por distancia.
  assert.equal(atenuacionPorDistanciaDb(1), 0);
});

test('gananciaPorPotenciaDb — vectores de motor-mvp.md sección 2', () => {
  // Vector A: "+ 19,031" con potencia=80 W
  assert.ok(Math.abs(gananciaPorPotenciaDb(80) - 19.031) < EPS);
  // Vector B/C: "+ 16,990" con potencia=50 W
  assert.ok(Math.abs(gananciaPorPotenciaDb(50) - 16.990) < EPS);
});

test('gananciaPorPotenciaDb — caso trivial a 1 W', () => {
  // 10·log10(1) = 0: la referencia de potencia es 1 W.
  assert.equal(gananciaPorPotenciaDb(1), 0);
});

test('sumarNivelesDb — dos fuentes incoherentes de igual nivel suman +3,01 dB', () => {
  // Identidad estándar de suma de potencias en dB: 10·log10(10^(L/10)+10^(L/10)) = L + 10·log10(2)
  const resultado = sumarNivelesDb([90, 90]);
  assert.ok(Math.abs(resultado - 93.01) < EPS);
});

test('sumarNivelesDb — una fuente sola devuelve el mismo nivel', () => {
  assert.ok(Math.abs(sumarNivelesDb([87.3]) - 87.3) < EPS);
});

test('sumarNivelesDb — fuente muy débil no cambia el resultado (10 dB menos = ruido)', () => {
  // Una segunda fuente 10 dB por debajo aporta ~0,41 dB, no +3.
  const resultado = sumarNivelesDb([90, 80]);
  assert.ok(Math.abs(resultado - 90.41) < EPS);
});

test('sensibilidadA1WDb — a 8 Ω el ajuste es prácticamente nulo (2,83V ≈ 1W en 8 Ω)', () => {
  // Es la razón por la que la industria usa 2,83V como referencia: coincide con 1W a 8 Ω.
  const resultado = sensibilidadA1WDb(85, 8);
  assert.ok(Math.abs(resultado - 85) < 0.01);
});

test('sensibilidadA1WDb — a 4 Ω, 2,83V son ~2W: la sensibilidad "a 1W" baja ~3,01 dB', () => {
  const resultado = sensibilidadA1WDb(85, 4);
  assert.ok(Math.abs(resultado - 81.99) < EPS);
});

test('sensibilidadA1WDb — a 16 Ω, 2,83V son ~0,5W: la sensibilidad "a 1W" sube ~3,01 dB', () => {
  const resultado = sensibilidadA1WDb(85, 16);
  assert.ok(Math.abs(resultado - 88.01) < EPS);
});

test('frecuenciaModoAxialHz — orden 1 en W=3,6 m: 343/(2·3,6) = 47,6389 Hz', () => {
  assert.ok(Math.abs(frecuenciaModoAxialHz(3.6, 1) - 47.6389) < EPS);
});

test('frecuenciaModoAxialHz — el orden escala linealmente (orden 3 = 3× el orden 1)', () => {
  const f1 = frecuenciaModoAxialHz(2.4, 1);
  const f3 = frecuenciaModoAxialHz(2.4, 3);
  assert.ok(Math.abs(f3 - 3 * f1) < EPS);
});

test('frecuenciaModoAxialHz — dimensiones en razón 3:2 (3,6 y 2,4) hacen coincidir modos de orden distinto', () => {
  // 3,6/2,4 = 3/2 exacto → el modo orden 3 de W coincide con el orden 2 de H.
  const modoW3 = frecuenciaModoAxialHz(3.6, 3);
  const modoH2 = frecuenciaModoAxialHz(2.4, 2);
  assert.ok(Math.abs(modoW3 - modoH2) < EPS);
});
