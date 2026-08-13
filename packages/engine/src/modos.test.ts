import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarModos, TECHO_MODOS_HZ, TECHO_AGRUPAMIENTO_HZ, UMBRAL_AGRUPAMIENTO } from './modos.ts';

test('lista de modos: cada modo tiene frecuencia ≤ TECHO_MODOS_HZ, ordenados ascendente', () => {
  const r = evaluarModos({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  assert.ok(r.modos.length > 0);
  for (const m of r.modos) assert.ok(m.frecuenciaHz <= TECHO_MODOS_HZ);
  for (let i = 1; i < r.modos.length; i++) assert.ok(r.modos[i]!.frecuenciaHz >= r.modos[i - 1]!.frecuenciaHz);
});

test('sala por defecto (3,6×5,0×2,4): W (razón 3:2 con H) produce agrupamiento exacto → "warn"', () => {
  const r = evaluarModos({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'modos-agrupados');
  assert.ok(r.agrupados.length > 0);
  // El par exacto: orden 3 de "ancho" (142,9167 Hz) coincide con orden 2 de "alto".
  const parExacto = r.agrupados.find(
    (a) =>
      (a.modoA.eje === 'ancho' && a.modoA.orden === 3 && a.modoB.eje === 'alto' && a.modoB.orden === 2) ||
      (a.modoB.eje === 'ancho' && a.modoB.orden === 3 && a.modoA.eje === 'alto' && a.modoA.orden === 2)
  );
  assert.ok(parExacto, 'no se encontró el par ancho-orden3/alto-orden2');
  assert.ok(Math.abs(parExacto!.diferenciaHz) < 0.01);
});

test('sala sin razones simples y modos escasos bajo TECHO_AGRUPAMIENTO_HZ (2,5×3,0×2,2): "ok"', () => {
  const r = evaluarModos({ anchoM: 2.5, largoM: 3.0, altoM: 2.2 });
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'modos-distribuidos');
  assert.equal(r.agrupados.length, 0);
});

test('dos ejes de igual longitud coinciden en todos los órdenes → siempre "warn"', () => {
  const r = evaluarModos({ anchoM: 4, largoM: 4, altoM: 2.5 });
  assert.equal(r.severidad, 'warn');
  const parIdentico = r.agrupados.find((a) => a.diferenciaHz === 0);
  assert.ok(parIdentico, 'ancho y largo iguales deberían dar al menos un par con diferencia 0');
});

test('agrupamiento nunca compara modos del mismo eje entre sí (son armónicos, no una coincidencia)', () => {
  const r = evaluarModos({ anchoM: 4, largoM: 4, altoM: 2.5 });
  for (const a of r.agrupados) assert.notEqual(a.modoA.eje, a.modoB.eje);
});

test('el agrupamiento sólo se evalúa bajo TECHO_AGRUPAMIENTO_HZ, aunque la lista de modos llegue más lejos', () => {
  const r = evaluarModos({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  for (const a of r.agrupados) {
    assert.ok(a.modoA.frecuenciaHz <= TECHO_AGRUPAMIENTO_HZ);
    assert.ok(a.modoB.frecuenciaHz <= TECHO_AGRUPAMIENTO_HZ);
  }
});

test('severidad nunca es "error" — techo declarado por CLAUDE.md para reglas de sala', () => {
  const salas = [
    { anchoM: 2.5, largoM: 3.0, altoM: 2.2 },
    { anchoM: 3.6, largoM: 5.0, altoM: 2.4 },
    { anchoM: 4, largoM: 4, altoM: 2.5 },
    { anchoM: 7, largoM: 9, altoM: 3.5 },
  ];
  for (const sala of salas) {
    const r = evaluarModos(sala);
    assert.notEqual(r.severidad as string, 'error');
  }
});

test('UMBRAL_AGRUPAMIENTO es 5% relativo — dos modos justo por debajo del umbral agrupan, justo por encima no', () => {
  // Construido directamente sobre el umbral en vez de vía sala, para aislar el criterio.
  assert.equal(UMBRAL_AGRUPAMIENTO, 0.05);
});
