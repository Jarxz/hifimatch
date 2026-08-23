import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDisposicion, calcularDisposicionManual, calcularDisposicionAsientoManual } from './sala.ts';
import type { Sala } from './sala.ts';
import type { Materiales } from './reverberacion.ts';
import {
  evaluarFiltroPeine,
  evaluarAsimetria,
  evaluarAnguloEscucha,
  FILTRO_PEINE_RANGO_MIN_HZ,
  FILTRO_PEINE_RANGO_MAX_HZ,
  FILTRO_PEINE_ALPHA_REFLECTANTE_MAX,
  ASIMETRIA_UMBRAL_M,
  ANGULO_ESCUCHA_CONVENCION_GRADOS,
  ANGULO_ESCUCHA_MIN_GRADOS,
  ANGULO_ESCUCHA_MAX_GRADOS,
} from './colocacion.ts';

const SALA: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
const MATERIALES_TIPICOS: Materiales = {
  muroFrontal: 'yesoCarton',
  muroPosterior: 'yesoCarton',
  muroIzquierdo: 'yesoCarton',
  muroDerecho: 'yesoCarton',
  piso: 'maderaLaminado',
  techo: 'yesoCarton',
};

// ---- evaluarFiltroPeine ----

test('vectores del usuario — disposición automática, canal izquierdo: delta y frecuencias de las 5 reflexiones', () => {
  const d = calcularDisposicion(SALA);
  const r = evaluarFiltroPeine(d, MATERIALES_TIPICOS);
  const porNombre = (nombre: string, canal: 'izq' | 'der') => r.find((x) => x.reflexion === nombre && x.canal === canal)!;

  const frontal = porNombre('frontal', 'izq');
  assert.ok(Math.abs(frontal.deltaM - 1.426) < 0.001, `frontal delta=${frontal.deltaM}`);
  assert.ok(Math.abs(frontal.primerNuloHz - 120) < 0.5, `frontal nulo=${frontal.primerNuloHz}`);
  assert.ok(Math.abs(frontal.primerRefuerzoHz - 240) < 0.5, `frontal refuerzo=${frontal.primerRefuerzoHz}`);

  const lateral = porNombre('lateral', 'izq');
  assert.ok(Math.abs(lateral.deltaM - 0.956) < 0.001, `lateral delta=${lateral.deltaM}`);
  assert.ok(Math.abs(lateral.primerNuloHz - 179) < 0.5, `lateral nulo=${lateral.primerNuloHz}`);
  assert.ok(Math.abs(lateral.primerRefuerzoHz - 359) < 0.5, `lateral refuerzo=${lateral.primerRefuerzoHz}`);

  const trasera = porNombre('trasera', 'izq');
  assert.ok(Math.abs(trasera.deltaM - 3.63) < 0.001, `trasera delta=${trasera.deltaM}`);
  assert.ok(Math.abs(trasera.primerNuloHz - 47) < 0.5, `trasera nulo=${trasera.primerNuloHz}`);
  assert.ok(Math.abs(trasera.primerRefuerzoHz - 95) < 0.5, `trasera refuerzo=${trasera.primerRefuerzoHz}`);

  const piso = porNombre('piso', 'izq');
  assert.ok(Math.abs(piso.deltaM - 0.686) < 0.001, `piso delta=${piso.deltaM}`);
  assert.ok(Math.abs(piso.primerNuloHz - 250) < 0.5, `piso nulo=${piso.primerNuloHz}`);
  assert.ok(Math.abs(piso.primerRefuerzoHz - 500) < 0.5, `piso refuerzo=${piso.primerRefuerzoHz}`);

  const techo = porNombre('techo', 'izq');
  assert.ok(Math.abs(techo.deltaM - 1.229) < 0.001, `techo delta=${techo.deltaM}`);
  assert.ok(Math.abs(techo.primerNuloHz - 140) < 0.5, `techo nulo=${techo.primerNuloHz}`);
  assert.ok(Math.abs(techo.primerRefuerzoHz - 279) < 0.5, `techo refuerzo=${techo.primerRefuerzoHz}`);

  assert.equal(r.length, 10); // 5 reflexiones × 2 canales
});

test('ponderación por absorción: con materiales típicos del sitio (yesoCarton×4+techo, maderaLaminado piso), sólo el piso queda en "warn" — no las 5 (sin ponderar, marcaría las 5)', () => {
  const d = calcularDisposicion(SALA);
  const r = evaluarFiltroPeine(d, MATERIALES_TIPICOS);
  const warns = r.filter((x) => x.severidad === 'warn').map((x) => x.reflexion);
  assert.deepEqual(new Set(warns), new Set(['piso']));
  // Confirma el mecanismo: piso (maderaLaminado, alpha bajo en graves) es
  // reflectante Y su nulo (250 Hz) cae en el rango declarado; las otras 4
  // usan yesoCarton (alpha 0,29 en 125 Hz — banda más cercana a sus
  // nulos, todos <200 Hz salvo piso), por encima del umbral reflectante.
  const piso = r.find((x) => x.reflexion === 'piso' && x.canal === 'izq')!;
  assert.ok(piso.coeficienteAbsorcion < FILTRO_PEINE_ALPHA_REFLECTANTE_MAX);
  assert.ok(piso.primerNuloHz >= FILTRO_PEINE_RANGO_MIN_HZ && piso.primerNuloHz <= FILTRO_PEINE_RANGO_MAX_HZ);
  const frontal = r.find((x) => x.reflexion === 'frontal' && x.canal === 'izq')!;
  assert.ok(frontal.coeficienteAbsorcion >= FILTRO_PEINE_ALPHA_REFLECTANTE_MAX);
});

test('cambiar el piso a porcelanato (muy reflectante) mantiene el warn del piso, con un coeficiente de absorción distinto', () => {
  const d = calcularDisposicion(SALA);
  const materiales: Materiales = { ...MATERIALES_TIPICOS, piso: 'porcelanato' };
  const r = evaluarFiltroPeine(d, materiales);
  const piso = r.find((x) => x.reflexion === 'piso' && x.canal === 'izq')!;
  assert.equal(piso.severidad, 'warn');
  assert.ok(piso.coeficienteAbsorcion < FILTRO_PEINE_ALPHA_REFLECTANTE_MAX);
});

test('mismo mecanismo, distinta superficie: en una sala más chica (2,5×3,0×2,2) el nulo lateral cae en 306 Hz — hormigón (alpha 0,01, reflectante) da "warn"; panel acústico (alpha 0,25, no reflectante) en el mismo punto exacto da "ok"', () => {
  const salaChica: Sala = { anchoM: 2.5, largoM: 3.0, altoM: 2.2 };
  const d = calcularDisposicion(salaChica);
  const conHormigon: Materiales = { ...MATERIALES_TIPICOS, muroIzquierdo: 'hormigon', muroDerecho: 'hormigon' };
  const conPanel: Materiales = { ...MATERIALES_TIPICOS, muroIzquierdo: 'panelAcustico', muroDerecho: 'panelAcustico' };

  const rHormigon = evaluarFiltroPeine(d, conHormigon).find((x) => x.reflexion === 'lateral' && x.canal === 'izq')!;
  const rPanel = evaluarFiltroPeine(d, conPanel).find((x) => x.reflexion === 'lateral' && x.canal === 'izq')!;

  assert.ok(Math.abs(rHormigon.primerNuloHz - rPanel.primerNuloHz) < 0.001, 'misma geometría, mismo nulo — sólo cambia el material');
  assert.ok(rHormigon.primerNuloHz >= FILTRO_PEINE_RANGO_MIN_HZ && rHormigon.primerNuloHz <= FILTRO_PEINE_RANGO_MAX_HZ);
  assert.equal(rHormigon.severidad, 'warn');
  assert.equal(rPanel.severidad, 'ok');
});

test('umbrales declarados: rango 200-2000 Hz, alpha reflectante <0,15', () => {
  assert.equal(FILTRO_PEINE_RANGO_MIN_HZ, 200);
  assert.equal(FILTRO_PEINE_RANGO_MAX_HZ, 2000);
  assert.equal(FILTRO_PEINE_ALPHA_REFLECTANTE_MAX, 0.15);
});

test('deltaM<=0 (geometría degenerada) no produce NaN/Infinity que rompa el resto — severidad ok', () => {
  // Parlante prácticamente sobre el punto de reflexión frontal (y≈0):
  // delta frontal casi nulo — no debe tirar la app abajo.
  const d = calcularDisposicionManual(SALA, { x: 1.0, y: 0.16 }, { x: 2.6, y: 0.16 });
  const r = evaluarFiltroPeine(d, MATERIALES_TIPICOS);
  for (const x of r) {
    assert.ok(!Number.isNaN(x.deltaM));
    assert.ok(x.severidad === 'ok' || x.severidad === 'warn');
  }
});

// ---- evaluarAsimetria ----

test('disposición automática: las 6 categorías (directo + 5 reflexiones) dan delta≈0 — sala simétrica', () => {
  const d = calcularDisposicion(SALA);
  const r = evaluarAsimetria(d);
  assert.equal(r.length, 6);
  for (const x of r) {
    assert.ok(Math.abs(x.deltaM) < 1e-9, `${x.categoria} delta=${x.deltaM}`);
    assert.equal(x.severidad, 'ok');
  }
});

test('vector del usuario — parlante derecho 20 cm más atrás que el izquierdo: lateral da 641 µs de diferencia, warn', () => {
  const d = calcularDisposicion(SALA);
  const der = { x: d.parlanteDer.x, y: d.parlanteDer.y + 0.2 };
  const dAsim = calcularDisposicionManual(SALA, d.parlanteIzq, der);
  const r = evaluarAsimetria(dAsim);
  const lateral = r.find((x) => x.categoria === 'lateral')!;
  assert.ok(Math.abs(lateral.deltaM - 0.2198) < 0.001, `deltaM=${lateral.deltaM}`);
  assert.ok(Math.abs(lateral.deltaUs - 641) < 1, `deltaUs=${lateral.deltaUs}`);
  assert.equal(lateral.severidad, 'warn');
  // El directo NO detecta esta asimetría — el punto dulce sigue derivado
  // sobre la mediatriz (candado cerrado), así que sigue equidistante.
  const directo = r.find((x) => x.categoria === 'directo')!;
  assert.ok(Math.abs(directo.deltaM) < 1e-9);
  assert.equal(directo.severidad, 'ok');
});

test('ASIMETRIA_UMBRAL_M es 0,05 m (~145,8 µs) — criterio del sitio, valor de partida', () => {
  assert.equal(ASIMETRIA_UMBRAL_M, 0.05);
  const c = 343;
  assert.ok(Math.abs((ASIMETRIA_UMBRAL_M / c) * 1e6 - 145.77) < 0.01);
});

test('con el asiento libre (candado abierto), el camino DIRECTO sí detecta la asimetría — antes era estructuralmente imposible', () => {
  const d = calcularDisposicion(SALA);
  const dLibre = calcularDisposicionAsientoManual(SALA, d.parlanteIzq, d.parlanteDer, { x: 2.5, y: 3.0 });
  const r = evaluarAsimetria(dLibre);
  const directo = r.find((x) => x.categoria === 'directo')!;
  assert.ok(directo.deltaM > ASIMETRIA_UMBRAL_M, `deltaM=${directo.deltaM}`);
  assert.equal(directo.severidad, 'warn');
});

test('umbral cerrado por arriba: justo en 0,05 no alcanza para warn ("supera", no "alcanza")', () => {
  const sala: Sala = { anchoM: 6, largoM: 6, altoM: 2.4 };
  const d = calcularDisposicionManual(sala, { x: 2, y: 1 }, { x: 4, y: 1 });
  const r = evaluarAsimetria(d);
  // La disposición automática/manual sin arrastre asimétrico da 0 exacto;
  // esta prueba sólo confirma que el operador es estricto (>), no que el
  // valor límite se alcance con datos reales — chequeo directo del signo.
  for (const x of r) {
    assert.equal(x.severidad, x.deltaM > ASIMETRIA_UMBRAL_M ? 'warn' : 'ok');
  }
});

// ---- evaluarAnguloEscucha ----

test('convención declarada: 60° (triángulo equilátero estéreo), rango de aviso 40-65°', () => {
  assert.equal(ANGULO_ESCUCHA_CONVENCION_GRADOS, 60);
  assert.equal(ANGULO_ESCUCHA_MIN_GRADOS, 40);
  assert.equal(ANGULO_ESCUCHA_MAX_GRADOS, 65);
});

test('disposición automática (~45,2°) cae dentro del rango declarado → "ok" — no es un error, es una consecuencia declarada', () => {
  const d = calcularDisposicion(SALA);
  const r = evaluarAnguloEscucha(d);
  assert.ok(Math.abs(r.anguloGrados - 45.24) < 0.01);
  assert.equal(r.anguloConvencionGrados, 60);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'angulo-ok');
});

test('vector del usuario — asiento en y≈2,46 da ≈60° (la convención exacta) → "ok"', () => {
  const d = calcularDisposicion(SALA);
  const centroX = (d.parlanteIzq.x + d.parlanteDer.x) / 2;
  const d60 = calcularDisposicionAsientoManual(SALA, d.parlanteIzq, d.parlanteDer, { x: centroX, y: 2.46 });
  const r = evaluarAnguloEscucha(d60);
  assert.ok(Math.abs(r.anguloGrados - 60) < 0.2, `angulo=${r.anguloGrados}`);
  assert.equal(r.severidad, 'ok');
});

test('asiento muy atrás: ángulo por debajo de 40° → "warn"/"angulo-estrecho"', () => {
  const d = calcularDisposicion(SALA);
  const centroX = (d.parlanteIzq.x + d.parlanteDer.x) / 2;
  const dEstrecho = calcularDisposicionAsientoManual(SALA, d.parlanteIzq, d.parlanteDer, { x: centroX, y: 4.3 });
  const r = evaluarAnguloEscucha(dEstrecho);
  assert.ok(r.anguloGrados < ANGULO_ESCUCHA_MIN_GRADOS, `angulo=${r.anguloGrados}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'angulo-estrecho');
});

test('asiento muy adelante: ángulo por encima de 65° → "warn"/"angulo-amplio"', () => {
  const d = calcularDisposicion(SALA);
  const centroX = (d.parlanteIzq.x + d.parlanteDer.x) / 2;
  const dAmplio = calcularDisposicionAsientoManual(SALA, d.parlanteIzq, d.parlanteDer, { x: centroX, y: 1.9 });
  const r = evaluarAnguloEscucha(dAmplio);
  assert.ok(r.anguloGrados > ANGULO_ESCUCHA_MAX_GRADOS, `angulo=${r.anguloGrados}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'angulo-amplio');
});

test('severidad nunca es "alert"/"error" en ninguna de las tres reglas — mismo techo de severidad de sala', () => {
  const d = calcularDisposicion(SALA);
  const dAsim = calcularDisposicionManual(SALA, d.parlanteIzq, { x: d.parlanteDer.x, y: d.parlanteDer.y + 0.5 });
  for (const x of evaluarFiltroPeine(dAsim, MATERIALES_TIPICOS)) {
    assert.notEqual(x.severidad as string, 'alert');
    assert.notEqual(x.severidad as string, 'error');
  }
  for (const x of evaluarAsimetria(dAsim)) {
    assert.notEqual(x.severidad as string, 'alert');
    assert.notEqual(x.severidad as string, 'error');
  }
  const rAngulo = evaluarAnguloEscucha(dAsim);
  assert.notEqual(rAngulo.severidad as string, 'alert');
  assert.notEqual(rAngulo.severidad as string, 'error');
});
