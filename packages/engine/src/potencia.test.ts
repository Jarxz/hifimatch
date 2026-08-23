import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarPotencia } from './potencia.ts';
import type { Parlante, Amplificador } from './tipos.ts';

const EPS = 0.05; // tolerancia estándar del proyecto (motor-mvp.md, cabecera)

// Dimensión mayor de sala para el término informativo gananciaSalaDb/
// frecuenciaGananciaSalaHz (cambio 3) — no afecta splDisponibleDb/margenDb,
// así que un valor fijo alcanza salvo donde se ejercita ese campo puntualmente.
const DIM_MAYOR_M = 5.0;

// Fixtures = packages/data/src/catalogo.ts (mismos valores, mismas fuentes).
// sensibilidadConvencion: null en los dos — ni Klipsch ni KEF declaran en su
// fuente citada si la sensibilidad es a 2,83V o a 1W (verificado leyendo el
// catálogo real antes de esta ronda), así que el motor degrada la confianza
// del resultado a 'baja' para ambos.
const klipsch: Parlante = {
  id: 'klipsch-rp600m-ii',
  nombre: 'Klipsch RP-600M II',
  tipo: 'Monitor de 2 vías, trompa Tractrix, puerto trasero',
  sensibilidadDb: { valor: 86, fuente: "Erin's Audio Corner (anecoica)", confianza: 'media' },
  sensibilidadConvencion: null,
  impedanciaNominalOhm: 8,
  impedanciaMinOhm: null,
  potenciaRecMinW: null,
  potenciaRecMaxW: 100,
  anguloFaseGrados: null,
  impedanciaMaxOhm: null,
};

const kef: Parlante = {
  id: 'kef-ls50-meta',
  nombre: 'KEF LS50 Meta',
  tipo: 'Monitor de 2 vías, puerto trasero, driver coaxial Uni-Q',
  sensibilidadDb: { valor: 85, fuente: 'KEF (ficha)', confianza: 'alta' },
  sensibilidadConvencion: null,
  impedanciaNominalOhm: 8,
  impedanciaMinOhm: 3.5,
  potenciaRecMinW: 40,
  potenciaRecMaxW: 100,
  anguloFaseGrados: null,
  impedanciaMaxOhm: null,
};

const cambridge: Amplificador = {
  id: 'cambridge-cxa81',
  nombre: 'Cambridge Audio CXA81',
  tipo: 'Integrado Clase AB, con DAC',
  potencia8OhmW: { valor: 80, fuente: 'Cambridge Audio (ficha)', confianza: 'alta' },
  potencia4OhmW: { valor: 120, fuente: 'Cambridge Audio (ficha)', confianza: 'alta' },
  cargaMinOhm: null,
  sensEntradaMv: 370,
  impedanciaEntradaOhm: 43000,
  factorAmortiguamiento: null,
};

const rega: Amplificador = {
  id: 'rega-brio',
  nombre: 'Rega Brio',
  tipo: 'Integrado Clase AB, con phono MM',
  potencia8OhmW: { valor: 50, fuente: 'Rega (ficha)', confianza: 'alta' },
  potencia4OhmW: { valor: 73, fuente: 'Stereophile (medición)', confianza: 'media' },
  cargaMinOhm: 4,
  sensEntradaMv: 210,
  impedanciaEntradaOhm: 47000,
  factorAmortiguamiento: null,
};

/**
 * Vectores A/B/C recalculados tras la corrección del módulo (auditoría
 * externa, 7,25 dB de error acumulado en tres defectos que se cancelaban
 * parcialmente entre sí). Klipsch y KEF son ambos de 8 Ω nominales, así que
 * el cambio 1 (normalización de sensibilidad) y el cambio 2 (potencia a la
 * carga real) no les mueven el número — 2,83V sobre 8 Ω es prácticamente
 * 1 W (diferencia <0,01 dB). Todo el movimiento de SPL en A/B/C viene del
 * cambio 3: SUMA_PAR_DB 6→3 y GANANCIA_SALA_DB (3 dB) ya no se suma al SPL
 * de banda ancha — una baja neta de exactamente 6 dB.
 *
 * La confianza NO cambia en ninguno de los dos: sensibilidadRangoAplica
 * exige impedanciaNominalOhm<8 además de sensibilidadSinConvencion — a 8 Ω
 * la ambigüedad de convención no mueve el número, así que degradarla ahí
 * sería un sello genérico sobre un dato que en la práctica no tiene
 * ambigüedad (feedback explícito tras la primera versión de esta
 * corrección, que sí degradaba siempre). Ver el vector de sintético 4 Ω
 * más abajo para el caso donde SÍ aplica el rango.
 */

test('Vector A — Klipsch + Cambridge CXA81, 2.5m, alto: margen +0,07 → Justo (antes +6,07 → Con margen; baja 6 dB exactos por el cambio 3)', () => {
  const r = evaluarPotencia(klipsch, cambridge, 2.5, 'alto', DIM_MAYOR_M);
  assert.ok(Math.abs(r.splDisponibleDb - 100.07) < EPS);
  assert.ok(Math.abs(r.margenDb - 0.07) < EPS);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'justo');
  // Klipsch no declara convención, pero es 8 Ω nominal → no degrada.
  assert.equal(r.confianza, 'media'); // peor(media sensibilidad, alta potencia) — sin cambios
  assert.equal(r.sensibilidadSinConvencion, true);
  assert.equal(r.sensibilidadRangoAplica, false); // ≥8Ω: la ambigüedad no mueve el número
  assert.equal(r.sensibilidadEfectivaRangoDb, null);
  assert.equal(r.potenciaDeCargaEstimada, false); // 8 Ω nominal, no aplica
  assert.equal(r.potenciaUsadaW, 80);
});

test('Vector B — KEF + Rega Brio, 3.0m, alto: margen −4,55 → Insuficiente (antes +1,45 → Justo; baja 6 dB exactos por el cambio 3)', () => {
  const r = evaluarPotencia(kef, rega, 3.0, 'alto', DIM_MAYOR_M);
  assert.ok(Math.abs(r.splDisponibleDb - 95.45) < EPS);
  assert.ok(Math.abs(r.margenDb - -4.55) < EPS);
  assert.equal(r.severidad, 'alert');
  assert.equal(r.codigo, 'insuficiente');
  // KEF tampoco declara convención, también 8 Ω nominal → no degrada.
  assert.equal(r.confianza, 'alta'); // peor(alta sensibilidad, alta potencia) — sin cambios
  assert.equal(r.sensibilidadRangoAplica, false);
});

test('Vector C — KEF + Rega Brio, 3.0m, referencia: margen −9,55 → Insuficiente (antes −3,55, ya era Insuficiente; sigue siéndolo con más margen negativo)', () => {
  const r = evaluarPotencia(kef, rega, 3.0, 'referencia', DIM_MAYOR_M);
  assert.ok(Math.abs(r.margenDb - -9.55) < EPS);
  assert.equal(r.severidad, 'alert');
  assert.equal(r.codigo, 'insuficiente');
});

test('Vector D (nuevo) — sintético 88 dB@2,83V/4Ω + ampli 80W/120W, 3.0m, alto: margen −0,77 → Insuficiente — el único vector que ejercita los 3 cambios a la vez', () => {
  const parlanteSintetico: Parlante = {
    id: 'synthetic-4ohm',
    nombre: 'Parlante de prueba (4 Ω, sensibilidad a 2,83V)',
    tipo: 'sintético para test',
    sensibilidadDb: { valor: 88, fuente: 'test', confianza: 'alta' },
    sensibilidadConvencion: '2.83V',
    impedanciaNominalOhm: 4,
    impedanciaMinOhm: null,
    potenciaRecMinW: null,
    potenciaRecMaxW: null,
    anguloFaseGrados: null,
    impedanciaMaxOhm: null,
  };
  const ampSintetico: Amplificador = {
    id: 'synthetic-80-120',
    nombre: 'Amplificador de prueba (80 W/120 W)',
    tipo: 'sintético para test',
    potencia8OhmW: { valor: 80, fuente: 'test', confianza: 'alta' },
    potencia4OhmW: { valor: 120, fuente: 'test', confianza: 'alta' },
    cargaMinOhm: null,
    sensEntradaMv: null,
    impedanciaEntradaOhm: null,
    factorAmortiguamiento: null,
  };
  const r = evaluarPotencia(parlanteSintetico, ampSintetico, 3.0, 'alto', DIM_MAYOR_M);
  // Sin corregir (fórmula vieja, p8 siempre, sensibilidad sin normalizar):
  // SPL = 88 − 9,542 + 19,031 + 6 + 3 = 106,49 → margen +6,49 → "Con margen".
  // Corregido: sensibilidad normalizada a 1W (88 − 3,02 ≈ 84,98), potencia a
  // 4Ω (120W, no 80W), SUMA_PAR_DB=3, sin GANANCIA_SALA_DB:
  // SPL = 84,98 − 9,542 + 20,792 + 3 = 99,23 → margen −0,77 → "Insuficiente".
  assert.ok(Math.abs(r.sensibilidadEfectivaDb - 84.98) < EPS);
  assert.ok(Math.abs(r.splDisponibleDb - 99.23) < EPS);
  assert.ok(Math.abs(r.margenDb - -0.77) < EPS);
  assert.equal(r.severidad, 'alert');
  assert.equal(r.codigo, 'insuficiente');
  assert.equal(r.potenciaUsadaW, 120); // 4 Ω, no 8 Ω
  assert.equal(r.potenciaDeCargaEstimada, false); // el ampli sí publica potencia4OhmW
  assert.equal(r.sensibilidadSinConvencion, false); // convención declarada ('2.83V')
  assert.equal(r.confianza, 'alta'); // sensibilidad alta + potencia4OhmW alta, sin degradar
});

test('sensibilidadRangoAplica — mismo parlante que el vector D pero SIN convención declarada (4 Ω): confianza baja a "baja" y se expone el rango completo, no sólo el punto pesimista', () => {
  const parlanteSinConvencion: Parlante = {
    id: 'synthetic-4ohm-sin-convencion',
    nombre: 'Parlante de prueba (4 Ω, convención desconocida)',
    tipo: 'sintético para test',
    sensibilidadDb: { valor: 88, fuente: 'test', confianza: 'alta' },
    sensibilidadConvencion: null, // a diferencia del vector D, acá no se sabe
    impedanciaNominalOhm: 4,
    impedanciaMinOhm: null,
    potenciaRecMinW: null,
    potenciaRecMaxW: null,
    anguloFaseGrados: null,
    impedanciaMaxOhm: null,
  };
  const ampSintetico: Amplificador = {
    id: 'synthetic-80-120',
    nombre: 'Amplificador de prueba (80 W/120 W)',
    tipo: 'sintético para test',
    potencia8OhmW: { valor: 80, fuente: 'test', confianza: 'alta' },
    potencia4OhmW: { valor: 120, fuente: 'test', confianza: 'alta' },
    cargaMinOhm: null,
    sensEntradaMv: null,
    impedanciaEntradaOhm: null,
    factorAmortiguamiento: null,
  };
  const r = evaluarPotencia(parlanteSinConvencion, ampSintetico, 3.0, 'alto', DIM_MAYOR_M);
  assert.equal(r.sensibilidadSinConvencion, true);
  assert.equal(r.sensibilidadRangoAplica, true); // 4Ω<8: la ambigüedad sí mueve el número
  assert.equal(r.confianza, 'baja'); // acá sí degrada — es el caso donde la ambigüedad importa
  // El punto usado para severidad es el PESIMISTA — coincide casi exacto
  // con el vector D (mismos números, ahí la convención SÍ era '2.83V').
  assert.ok(r.sensibilidadEfectivaRangoDb !== null);
  const [pesimista, optimista] = r.sensibilidadEfectivaRangoDb!;
  assert.ok(Math.abs(pesimista - 84.986) < EPS);
  assert.ok(Math.abs(optimista - 88) < EPS);
  assert.ok(Math.abs(r.margenDb - -0.76) < EPS); // extremo pesimista, severidad conservadora
  assert.equal(r.codigo, 'insuficiente');
  assert.ok(r.margenRangoDb !== null);
  const [margenPesimista, margenOptimista] = r.margenRangoDb!;
  assert.ok(Math.abs(margenPesimista - r.margenDb) < EPS); // el pesimista del rango = margenDb
  // 2,25 dB cae en "justo" (0≤margen<3), no en "con-margen" (≥3) — este
  // vector ya cruza un umbral (insuficiente→justo), aunque no el más
  // dramático (insuficiente→con-margen, ver el test siguiente).
  assert.ok(Math.abs(margenOptimista - 2.25) < EPS);
  assert.equal(r.codigoRangoOptimista, 'justo');
  assert.equal(r.margenCruzaUmbral, true);
});

test('margenCruzaUmbral — caso extremo insuficiente→con-margen: el veredicto (no sólo el margen) depende de un dato de catálogo que falta', () => {
  // Sintético, Z=1Ω a propósito (fuera del rango típico de un parlante
  // real) para conseguir un salto de convención lo bastante grande
  // (~9 dB) como para cruzar los DOS umbrales de severidad a la vez —
  // el caso que ilustra mejor por qué reportar sólo el pesimista sería
  // engañoso: no es "un poco insuficiente", es "no se sabe".
  const parlanteExtremo: Parlante = {
    id: 'synthetic-1ohm-sin-convencion',
    nombre: 'Parlante de prueba (1 Ω sintético, convención desconocida)',
    tipo: 'sintético para test',
    sensibilidadDb: { valor: 92, fuente: 'test', confianza: 'alta' },
    sensibilidadConvencion: null,
    impedanciaNominalOhm: 1,
    impedanciaMinOhm: null,
    potenciaRecMinW: null,
    potenciaRecMaxW: null,
    anguloFaseGrados: null,
    impedanciaMaxOhm: null,
  };
  const ampSintetico2: Amplificador = {
    id: 'synthetic-40w',
    nombre: 'Amplificador de prueba (40 W)',
    tipo: 'sintético para test',
    potencia8OhmW: { valor: 40, fuente: 'test', confianza: 'alta' },
    potencia4OhmW: null,
    cargaMinOhm: null,
    sensEntradaMv: null,
    impedanciaEntradaOhm: null,
    factorAmortiguamiento: null,
  };
  const r = evaluarPotencia(parlanteExtremo, ampSintetico2, 2.0, 'alto', DIM_MAYOR_M);
  assert.equal(r.sensibilidadRangoAplica, true);
  assert.equal(r.codigo, 'insuficiente'); // headline: extremo pesimista
  assert.equal(r.codigoRangoOptimista, 'con-margen'); // extremo optimista: otro código totalmente distinto
  assert.equal(r.margenCruzaUmbral, true);
  assert.ok(r.margenDb < 0);
  assert.ok(r.margenRangoDb !== null);
  assert.ok(r.margenRangoDb![1] >= 3);
});

test('sensibilidadRangoAplica — a 8Ω, aunque falte la convención, no hay rango ni degradación (2,83V≈1W a esa impedancia)', () => {
  const parlante8OhmSinConvencion: Parlante = { ...kef, sensibilidadConvencion: null };
  const r = evaluarPotencia(parlante8OhmSinConvencion, cambridge, 2.5, 'alto', DIM_MAYOR_M);
  assert.equal(r.sensibilidadSinConvencion, true);
  assert.equal(r.sensibilidadRangoAplica, false);
  assert.equal(r.sensibilidadEfectivaRangoDb, null);
  assert.equal(r.margenRangoDb, null);
  assert.notEqual(r.confianza, 'baja'); // no degrada sólo por impedancia≥8Ω
});

test('Cambio 2 — parlante ≤4Ω sin dato de potencia4OhmW: usa potencia8OhmW y lo marca como estimado', () => {
  const parlante4Ohm: Parlante = { ...kef, impedanciaNominalOhm: 4 };
  const ampSinP4: Amplificador = { ...rega, potencia4OhmW: null };
  const r = evaluarPotencia(parlante4Ohm, ampSinP4, 3.0, 'alto', DIM_MAYOR_M);
  assert.equal(r.potenciaUsadaW, rega.potencia8OhmW.valor);
  assert.equal(r.potenciaDeCargaEstimada, true);
});

test('Rega Brio (50W) no dispara aviso de potenciaRecMinW de KEF (40W): 50 ≥ 40', () => {
  const r = evaluarPotencia(kef, rega, 3.0, 'alto', DIM_MAYOR_M);
  assert.deepEqual(r.avisos, []);
});

test('aviso extra: amplificador por debajo de potenciaRecMinW del parlante', () => {
  const ampSubpotente: Amplificador = {
    id: 'synthetic-30w',
    nombre: 'Amplificador de prueba (30 W)',
    tipo: 'sintético para test',
    potencia8OhmW: { valor: 30, fuente: 'test', confianza: 'alta' },
    potencia4OhmW: null,
    cargaMinOhm: null,
    sensEntradaMv: null,
    impedanciaEntradaOhm: null,
    factorAmortiguamiento: null,
  };
  // KEF pide desde 40W (potenciaRecMinW); este ampli da 30W < 40W.
  const r = evaluarPotencia(kef, ampSubpotente, 2.5, 'moderado', DIM_MAYOR_M);
  assert.equal(r.avisos.length, 1);
  assert.deepEqual(r.avisos[0], { codigo: 'bajo-potencia-recomendada', recomendadaW: 40, entregadaW: 30 });
});

test('límite exacto margen=3 cae en "ok", no en "warn" (frontera cerrada por arriba)', () => {
  // dist=1, p8=1 (0dB cada término): SPL = sens + SUMA_PAR_DB(3) = sens + 3.
  // Para margen=3 con pico=90 (moderado): sens = 90 − 3 + 3 = 90.
  // (Antes, con SUMA_PAR_DB=6 + GANANCIA_SALA_DB=3, sens=84 — recalculado:
  // la baja de 9 a 3 dB de bonus exige 6 dB más de sensibilidad citada
  // para tocar el mismo margen.)
  const parlanteLimite: Parlante = { ...kef, sensibilidadDb: { valor: 90, fuente: 'test', confianza: 'alta' } };
  const ampUnitario: Amplificador = { ...cambridge, potencia8OhmW: { valor: 1, fuente: 'test', confianza: 'alta' } };
  const r = evaluarPotencia(parlanteLimite, ampUnitario, 1, 'moderado', DIM_MAYOR_M);
  assert.ok(Math.abs(r.margenDb - 3) < EPS);
  assert.equal(r.severidad, 'ok');
});

test('límite exacto margen=0 cae en "warn", no en "alert" (frontera cerrada por arriba)', () => {
  // Para margen=0 con pico=90: sens = 90 − 3 = 87 (antes: 81).
  const parlanteLimite: Parlante = { ...kef, sensibilidadDb: { valor: 87, fuente: 'test', confianza: 'alta' } };
  const ampUnitario: Amplificador = { ...cambridge, potencia8OhmW: { valor: 1, fuente: 'test', confianza: 'alta' } };
  const r = evaluarPotencia(parlanteLimite, ampUnitario, 1, 'moderado', DIM_MAYOR_M);
  assert.ok(Math.abs(r.margenDb - 0) < EPS);
  assert.equal(r.severidad, 'warn');
});

test('gananciaSalaDb/frecuenciaGananciaSalaHz son informativos: no cambian con distinta dimensionMayorSalaM, splDisponibleDb tampoco', () => {
  const rChico = evaluarPotencia(kef, rega, 3.0, 'alto', 3.6);
  const rGrande = evaluarPotencia(kef, rega, 3.0, 'alto', 8.0);
  assert.equal(rChico.splDisponibleDb, rGrande.splDisponibleDb);
  assert.equal(rChico.margenDb, rGrande.margenDb);
  assert.equal(rChico.gananciaSalaDb, 3);
  // f = 343 / (2·dimensionMayorSalaM) — mayor dimensión, menor frecuencia.
  assert.ok(Math.abs(rChico.frecuenciaGananciaSalaHz - 343 / (2 * 3.6)) < EPS);
  assert.ok(Math.abs(rGrande.frecuenciaGananciaSalaHz - 343 / (2 * 8.0)) < EPS);
  assert.ok(rGrande.frecuenciaGananciaSalaHz < rChico.frecuenciaGananciaSalaHz);
});
