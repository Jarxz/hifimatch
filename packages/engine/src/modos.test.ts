import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluarModos,
  evaluarNuloEscucha,
  evaluarAcoplamientoModal,
  paresMasImportantes,
  techoModosDesdeSchroeder,
  TECHO_MODOS_HZ,
  TECHO_AGRUPAMIENTO_HZ,
  UMBRAL_AGRUPAMIENTO,
  UMBRAL_AGRUPAMIENTO_EXACTO,
  MIN_PARES_AGRUPADOS,
  CLAMP_TECHO_MODOS_MIN_HZ,
  CLAMP_TECHO_MODOS_MAX_HZ,
  TOP_N_AGRUPADOS,
  VENTANA_NULO_MODAL,
  UMBRAL_PRODUCTO_ACOPLAMIENTO_ALTO,
} from './modos.ts';
import { calcularDisposicion } from './sala.ts';

test('lista de modos: cada modo tiene frecuencia ≤ TECHO_MODOS_HZ (techo por defecto), ordenados ascendente', () => {
  const r = evaluarModos({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  assert.ok(r.modos.length > 0);
  for (const m of r.modos) assert.ok(m.frecuenciaHz <= TECHO_MODOS_HZ);
  for (let i = 1; i < r.modos.length; i++) assert.ok(r.modos[i]!.frecuenciaHz >= r.modos[i - 1]!.frecuenciaHz);
});

test('techoModosHz explícito reemplaza TECHO_MODOS_HZ para el LISTADO de modos — sin afectar el agrupamiento, siempre que no baje de TECHO_AGRUPAMIENTO_HZ (garantizado por el clamp de techoModosDesdeSchroeder)', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  const techoChico = 200; // < TECHO_MODOS_HZ (300) pero ≥ TECHO_AGRUPAMIENTO_HZ (150)
  const r = evaluarModos(sala, techoChico);
  const rDefault = evaluarModos(sala);
  assert.ok(r.modos.length > 0);
  for (const m of r.modos) assert.ok(m.frecuenciaHz <= techoChico);
  assert.ok(r.modos.length < rDefault.modos.length, 'un techo de listado más chico debería listar menos modos');
  // El agrupamiento sigue evaluándose bajo TECHO_AGRUPAMIENTO_HZ (150) fijo,
  // no bajo el techo de listado — mismo resultado que con el techo por defecto,
  // porque ninguno de los dos techos recorta por debajo de 150 Hz.
  assert.deepEqual(r.agrupados, rDefault.agrupados);
});

test('un techoModosHz por debajo de TECHO_AGRUPAMIENTO_HZ SÍ recorta el agrupamiento — documenta el límite real de la garantía de arriba (el clamp [150,400] es lo que la evita en la práctica)', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  const rTruncado = evaluarModos(sala, 100); // por debajo de TECHO_AGRUPAMIENTO_HZ (150)
  const rDefault = evaluarModos(sala);
  assert.ok(rTruncado.agrupados.length < rDefault.agrupados.length);
});

test('techoModosDesdeSchroeder: pasa la fs tal cual dentro del clamp, recorta fuera de él', () => {
  assert.equal(CLAMP_TECHO_MODOS_MIN_HZ, 150);
  assert.equal(CLAMP_TECHO_MODOS_MAX_HZ, 400);
  assert.equal(techoModosDesdeSchroeder(205.24), 205.24);
  assert.equal(techoModosDesdeSchroeder(50), 150);
  assert.equal(techoModosDesdeSchroeder(999), 400);
});

test('techoModosDesdeSchroeder: fs=null (sala fuera del dominio de Sabine/Eyring, ver reverberacion.ts) cae al techo por defecto, no a un número inventado', () => {
  assert.equal(techoModosDesdeSchroeder(null), TECHO_MODOS_HZ);
});

test('sala por defecto (3,6×5,0×2,4): W (razón 3:2 con H) produce un solapamiento casi exacto → "warn" por UMBRAL_AGRUPAMIENTO_EXACTO', () => {
  const r = evaluarModos({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'modos-agrupados');
  // Con el umbral recalibrado a 2%, esta sala da un único par por debajo de
  // ese umbral (vector recalculado — antes, a 5%, daba 4 pares).
  assert.equal(r.agrupados.length, 1);
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

test('dos ejes de igual longitud (4×4×2,5): 3 pares exactos por debajo de 2% → "warn" por MIN_PARES_AGRUPADOS', () => {
  const r = evaluarModos({ anchoM: 4, largoM: 4, altoM: 2.5 });
  assert.equal(r.severidad, 'warn');
  assert.equal(r.agrupados.length, 3);
  assert.ok(r.agrupados.every((a) => a.diferenciaHz === 0), 'ancho y largo iguales: todos los pares deberían tener diferencia 0');
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

test('umbrales de agrupamiento: 2% general, 1% "casi exacto" (un solo par ya alcanza), 2 pares mínimo en el resto', () => {
  assert.equal(UMBRAL_AGRUPAMIENTO, 0.02);
  assert.equal(UMBRAL_AGRUPAMIENTO_EXACTO, 0.01);
  assert.equal(MIN_PARES_AGRUPADOS, 2);
});

test('un único par "flojo" (entre 1% y 2%) no alcanza para "warn" — hace falta el par exacto o un segundo par', () => {
  // Vector sintético: dos modos de ejes distintos con Δ relativo ≈1,32% —
  // por debajo de UMBRAL_AGRUPAMIENTO (2%) pero por encima de
  // UMBRAL_AGRUPAMIENTO_EXACTO (1%), y es el ÚNICO par de esta sala.
  const sala = { anchoM: 2.5, largoM: 3.8, altoM: 8 }; // alto muy alto: sin modos propios bajo 150 Hz
  const r = evaluarModos(sala);
  const candidatosAncho = r.modos.filter((m) => m.eje === 'ancho' && m.frecuenciaHz <= TECHO_AGRUPAMIENTO_HZ);
  const candidatosLargo = r.modos.filter((m) => m.eje === 'largo' && m.frecuenciaHz <= TECHO_AGRUPAMIENTO_HZ);
  assert.ok(candidatosAncho.length > 0 && candidatosLargo.length > 0, 'vector necesita candidatos en ambos ejes');
  assert.equal(r.agrupados.length, 1, 'este vector necesita exactamente un par bajo el umbral general');
  const rel = r.agrupados[0]!.diferenciaHz / ((r.agrupados[0]!.modoA.frecuenciaHz + r.agrupados[0]!.modoB.frecuenciaHz) / 2);
  assert.ok(rel >= UMBRAL_AGRUPAMIENTO_EXACTO, `este vector necesita un par por ENCIMA de 1%, dio ${rel * 100}%`);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'modos-distribuidos');
});

// ---- paresMasImportantes: curación compartida con curvamodal.ts (curvas 1D) ----

test('sala 4×4×2,5 (dos ejes iguales): da 3 agrupamientos, más de los que se curan', () => {
  const r = evaluarModos({ anchoM: 4, largoM: 4, altoM: 2.5 });
  assert.equal(r.agrupados.length, 3);
  assert.ok(r.agrupados.length > TOP_N_AGRUPADOS);
});

test('paresMasImportantes corta a TOP_N_AGRUPADOS, ordenados por frecuencia promedio ascendente', () => {
  const r = evaluarModos({ anchoM: 4, largoM: 4, altoM: 2.5 });
  const top = paresMasImportantes(r.agrupados);
  assert.equal(top.length, TOP_N_AGRUPADOS);
  assert.equal(TOP_N_AGRUPADOS, 2);

  // Par 1 (el más grave): ancho orden 1 (42,875 Hz) con largo orden 1 (42,875 Hz).
  const par1 = top[0]!;
  assert.deepEqual([par1.modoA.eje, par1.modoB.eje].sort(), ['ancho', 'largo']);
  assert.equal(par1.modoA.orden, 1);
  assert.equal(par1.modoB.orden, 1);

  // Par 2: ancho orden 2 (85,75 Hz) con largo orden 2 (85,75 Hz).
  const par2 = top[1]!;
  assert.deepEqual([par2.modoA.eje, par2.modoB.eje].sort(), ['ancho', 'largo']);
  assert.equal(par2.modoA.orden, 2);
  assert.equal(par2.modoB.orden, 2);

  // El par de orden 3 (128,625 Hz) queda fuera del top-2.
  const quedaFuera = r.agrupados.find((a) => a.modoA.orden === 3 || a.modoB.orden === 3);
  assert.ok(quedaFuera);
  assert.ok(!top.includes(quedaFuera!));
});

test('paresMasImportantes con menos agrupamientos que TOP_N_AGRUPADOS devuelve todos, sin inventar', () => {
  const r = evaluarModos({ anchoM: 4, largoM: 4, altoM: 2.5 });
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

// ---- evaluarAcoplamientoModal: la misma cos(nπy/L) aplicada a la fuente, no sólo al oyente ----

test('vector del usuario — disposición automática (parlante y=0,75, escucha y=3,126): productos 34%/42%/14% en los órdenes 1-3', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  const r = evaluarAcoplamientoModal(sala, 0.75, 3.126);
  assert.equal(r.modos.length, 3);
  assert.deepEqual(r.modos.map((m) => m.orden), [1, 2, 3]);
  assert.ok(Math.abs(r.modos[0]!.frecuenciaHz - 34.3) < 0.01);
  assert.ok(Math.abs(r.modos[1]!.frecuenciaHz - 68.6) < 0.01);
  assert.ok(Math.abs(r.modos[2]!.frecuenciaHz - 102.9) < 0.01);
  assert.ok(Math.abs(r.modos[0]!.producto - 0.341) < 0.001, `n1=${r.modos[0]!.producto}`);
  assert.ok(Math.abs(r.modos[1]!.producto - 0.415) < 0.001, `n2=${r.modos[1]!.producto}`);
  assert.ok(Math.abs(r.modos[2]!.producto - 0.145) < 0.001, `n3=${r.modos[2]!.producto}`);
  // Ninguno de los 3 supera 0,7 → "ok", ningún modo fuertemente acoplado en ambos extremos
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'acoplamiento-bajo');
});

test('vector del usuario — parlantes movidos a y=1,35 (escucha se recalcula a y=3,726): el modo 2 cae de 42% a 0% ("cancelaste un modo"), el modo 3 sube a 61%', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  const r = evaluarAcoplamientoModal(sala, 1.35, 3.726);
  assert.ok(Math.abs(r.modos[0]!.producto - 0.461) < 0.001, `n1=${r.modos[0]!.producto}`);
  assert.ok(Math.abs(r.modos[1]!.producto - 0.004) < 0.002, `n2=${r.modos[1]!.producto}`);
  assert.ok(Math.abs(r.modos[2]!.producto - 0.611) < 0.001, `n3=${r.modos[2]!.producto}`);
  // Todavía ninguno supera 0,7 en este vector puntual — sigue "ok".
  assert.equal(r.severidad, 'ok');
});

test('UMBRAL_PRODUCTO_ACOPLAMIENTO_ALTO es 0,7 (criterio del sitio, "empezar en 0,7" — declarado, no una convención publicada)', () => {
  assert.equal(UMBRAL_PRODUCTO_ACOPLAMIENTO_ALTO, 0.7);
});

test('severidad "warn" cuando algún producto supera 0,7 — parlante y escucha ambos cerca de un antinodo del mismo modo', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  // Orden 1: antinodos en y=0 e y=L. Parlante y escucha cerca de los dos
  // extremos opuestos maximizan |cos| en ambos simultáneamente.
  const r = evaluarAcoplamientoModal(sala, 0.05, 4.95);
  assert.ok(r.modos[0]!.producto > UMBRAL_PRODUCTO_ACOPLAMIENTO_ALTO, `producto=${r.modos[0]!.producto}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'acoplamiento-alto');
});

test('el peor caso posible: parlante y escucha contra el muro del fondo (el sofá contra la pared, la sentada más común en un living real) — 100% en los 3 órdenes a la vez', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  const r = evaluarAcoplamientoModal(sala, sala.largoM, sala.largoM);
  for (const m of r.modos) {
    assert.ok(Math.abs(m.acoplamientoParlante - 1) < 1e-9, `orden ${m.orden} acoplamientoParlante=${m.acoplamientoParlante}`);
    assert.ok(Math.abs(m.acoplamientoEscucha - 1) < 1e-9, `orden ${m.orden} acoplamientoEscucha=${m.acoplamientoEscucha}`);
    assert.ok(Math.abs(m.producto - 1) < 1e-9, `orden ${m.orden} producto=${m.producto}`);
  }
  assert.equal(r.severidad, 'warn');
});

test('acoplamiento bajo: parlante y escucha en nodos de modos distintos — ningún producto supera el umbral', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // L=5.0
  // Nodo del modo 1 está en y=L/2=2.5; parlante ahí anula el modo 1 sin
  // importar dónde esté la escucha.
  const r = evaluarAcoplamientoModal(sala, 2.5, 1.0);
  assert.ok(r.modos[0]!.acoplamientoParlante < 1e-9, `n1 parlante=${r.modos[0]!.acoplamientoParlante}`);
  assert.ok(r.modos[0]!.producto < 1e-9, `n1 producto=${r.modos[0]!.producto}`);
});

test('severidad nunca es "alert"/"error" — mismo techo de severidad de sala que el resto del motor', () => {
  const sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
  for (const [py, ey] of [
    [0, 0],
    [sala.largoM, sala.largoM],
    [2.5, 2.5],
    [1.234, 3.987],
  ] as const) {
    const r = evaluarAcoplamientoModal(sala, py, ey);
    assert.notEqual(r.severidad as string, 'alert');
    assert.notEqual(r.severidad as string, 'error');
  }
});
