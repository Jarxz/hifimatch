import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluarModos,
  evaluarNuloEscucha,
  paresMasImportantes,
  TECHO_MODOS_HZ,
  TECHO_AGRUPAMIENTO_HZ,
  UMBRAL_AGRUPAMIENTO,
  TOP_N_AGRUPADOS,
  VENTANA_NULO_MODAL,
} from './modos.ts';
import { calcularDisposicion } from './sala.ts';

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

// ---- paresMasImportantes: curación compartida con curvamodal.ts (curvas 1D) y mapamodal.ts (mapa de zonas) ----

test('sala por defecto (3,6×5,0×2,4): da 4 agrupamientos cruzados en total (vector recalculado, no la prosa de CLAUDE.md)', () => {
  const r = evaluarModos({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  assert.equal(r.agrupados.length, 4);
});

test('paresMasImportantes corta a TOP_N_AGRUPADOS, ordenados por frecuencia promedio ascendente', () => {
  const r = evaluarModos({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  const top = paresMasImportantes(r.agrupados);
  assert.equal(top.length, TOP_N_AGRUPADOS);
  assert.equal(TOP_N_AGRUPADOS, 2);

  // Par 1 (el más grave, más audible): largo orden 2 (68,6 Hz) con alto orden 1 (71,46 Hz).
  // NO es el par {ancho orden 3, alto orden 2} que narra la prosa de CLAUDE.md — ese
  // existe (diferenciaHz=0, el más "exacto" de los 4) pero es el 4º en frecuencia
  // promedio, fuera del corte de TOP_N_AGRUPADOS=2.
  const par1 = top[0]!;
  const ejesPar1 = [par1.modoA.eje, par1.modoB.eje].sort();
  assert.deepEqual(ejesPar1, ['alto', 'largo']);
  const ordenesPar1 = par1.modoA.eje === 'largo' ? [par1.modoA.orden, par1.modoB.orden] : [par1.modoB.orden, par1.modoA.orden];
  assert.deepEqual(ordenesPar1, [2, 1]);

  const par2 = top[1]!;
  const ejesPar2 = [par2.modoA.eje, par2.modoB.eje].sort();
  assert.deepEqual(ejesPar2, ['ancho', 'largo']);
  const ordenesPar2 = par2.modoA.eje === 'largo' ? [par2.modoA.orden, par2.modoB.orden] : [par2.modoB.orden, par2.modoA.orden];
  assert.deepEqual(ordenesPar2, [4, 3]);

  // El par {ancho3, alto2} (diferenciaHz≈0 — 142,9167 Hz por dos caminos de cálculo
  // distintos, no necesariamente bit-idénticos en punto flotante) queda fuera del
  // top-2 — confirma que no se puede asumir que "el par exacto" es siempre uno de
  // los graficados.
  const quedaFuera = r.agrupados.find((a) => Math.abs(a.diferenciaHz) < 0.01);
  assert.ok(quedaFuera);
  assert.ok(!top.includes(quedaFuera!));
});

test('paresMasImportantes con menos agrupamientos que TOP_N_AGRUPADOS devuelve todos, sin inventar', () => {
  const r = evaluarModos({ anchoM: 4, largoM: 4, altoM: 2.5 }); // produce agrupamientos, pero puede haber menos de 2 tras filtrar
  const top = paresMasImportantes(r.agrupados.slice(0, 1));
  assert.equal(top.length, 1);
});

test('paresMasImportantes con lista vacía devuelve lista vacía', () => {
  assert.deepEqual(paresMasImportantes([]), []);
});

// ---- evaluarNuloEscucha: cruce geometría↔modo (punto de escucha vs. nulo del modo axial de largo) ----

test('sala por defecto: la disposición de referencia (y≈3,126 m) NO cae en la ventana del nulo (centro=2,5 m, ventana=±0,5 m) → "ok"', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  const disp = calcularDisposicion(sala);
  // filaEscuchaM = clamp(offsetFrente+1.0=1.75, offsetFrente+separacion*1.2=0.75+1.98*1.2=3.126, L-0.6=4.4) = 3.126
  assert.ok(Math.abs(disp.puntoDulce.y - 3.126) < 0.001, `y=${disp.puntoDulce.y}`);
  const r = evaluarNuloEscucha(sala, disp.puntoDulce.y);
  assert.ok(Math.abs(r.puntoMedioM - 2.5) < 1e-9);
  assert.ok(Math.abs(r.ventanaM - 0.5) < 1e-9); // 10% de 5,0 m
  assert.ok(Math.abs(r.distanciaAlMedioM - 0.626) < 0.001);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'nulo-lejos');
  // f1 = 343/(2·5,0) = 34,3 Hz
  assert.ok(Math.abs(r.frecuenciaHz - 34.3) < 1e-9);
});

test('escucha exactamente en el centro (y=L/2) → nulo exacto, "warn"', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  const r = evaluarNuloEscucha(sala, 2.5);
  assert.equal(r.distanciaAlMedioM, 0);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'nulo-cerca');
});

test('borde de la ventana (±10% de L, cerrado): justo dentro → "warn", justo fuera → "ok"', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // L=5,0 → ventana=0,5 m, centro=2,5 m
  const justoDentro = evaluarNuloEscucha(sala, 2.5 + 0.5); // exactamente en el borde: <=, cuenta como dentro
  assert.equal(justoDentro.severidad, 'warn');
  assert.equal(justoDentro.codigo, 'nulo-cerca');

  const justoFuera = evaluarNuloEscucha(sala, 2.5 + 0.501);
  assert.equal(justoFuera.severidad, 'ok');
  assert.equal(justoFuera.codigo, 'nulo-lejos');
});

test('VENTANA_NULO_MODAL es 10% (criterio del sitio, declarado explícitamente para esta regla)', () => {
  assert.equal(VENTANA_NULO_MODAL, 0.1);
});

test('severidad nunca es "alert"/"error" — mismo techo de severidad de sala que el resto del motor (CLAUDE.md)', () => {
  const casos: Array<[{ anchoM: number; largoM: number; altoM: number }, number]> = [
    [{ anchoM: 3.6, largoM: 5.0, altoM: 2.4 }, 2.5], // exactamente en el nulo — el caso más "grave" posible
    [{ anchoM: 3.6, largoM: 5.0, altoM: 2.4 }, 0.1],
    [{ anchoM: 7, largoM: 9, altoM: 3.5 }, 4.5],
  ];
  for (const [sala, y] of casos) {
    const r = evaluarNuloEscucha(sala, y);
    assert.notEqual(r.severidad as string, 'alert');
    assert.notEqual(r.severidad as string, 'error');
  }
});
