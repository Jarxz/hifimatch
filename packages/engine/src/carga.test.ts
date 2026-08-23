import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarCarga, EPDR_ALERT_OHM, EPDR_WARN_OHM, FASE_SUPUESTA_GRADOS } from './carga.ts';
import type { Parlante, Amplificador } from './tipos.ts';

// Mismos fixtures que potencia.test.ts (= packages/data/src/catalogo.ts).
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

test('KEF (minZ 3,5) + Cambridge CXA81 (80/120): dura, potente (80≥60) → Cubierto', () => {
  const r = evaluarCarga(kef, cambridge);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'cubierto');
});

test('KEF (minZ 3,5) + Rega Brio (50/73): dura, reserva 1,46<1,7, no potente (50<60) → Exige corriente', () => {
  const r = evaluarCarga(kef, rega);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'exige-corriente');
});

test('Klipsch (minZ null) + cualquier ampli → Sin dato', () => {
  const r1 = evaluarCarga(klipsch, cambridge);
  const r2 = evaluarCarga(klipsch, rega);
  assert.equal(r1.severidad, 'sin-datos');
  assert.equal(r1.codigo, 'sin-dato');
  assert.equal(r2.severidad, 'sin-datos');
});

test('regresión: ampli de 55W sin dato a 4Ω, especie dura → Exige corriente (no "Cubierto")', () => {
  // Este es el caso donde el prototipo tenía el bug real: un umbral de 50W en vez
  // de 60W hacía que este amplificador pasara como "Cubierto". Ver git log.
  const ampMediocre: Amplificador = {
    id: 'synthetic-55w',
    nombre: 'Amplificador de prueba (55 W, sin dato a 4Ω)',
    tipo: 'sintético para test',
    potencia8OhmW: { valor: 55, fuente: 'test', confianza: 'alta' },
    potencia4OhmW: null,
    cargaMinOhm: null,
    sensEntradaMv: null,
    impedanciaEntradaOhm: null,
    factorAmortiguamiento: null,
  };
  const r = evaluarCarga(kef, ampMediocre);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'exige-corriente');
});

test('reserva de corriente resuelve una carga dura aunque la potencia bruta sea baja', () => {
  // 40W/8Ω pero 80W/4Ω: ratio 2.0 ≥ 1.7 → reserva=true → resuelta, aunque 40<60.
  const ampReserva: Amplificador = {
    id: 'synthetic-reserva',
    nombre: 'Amplificador de prueba (40W, dobla a 4Ω)',
    tipo: 'sintético para test',
    potencia8OhmW: { valor: 40, fuente: 'test', confianza: 'alta' },
    potencia4OhmW: { valor: 80, fuente: 'test', confianza: 'alta' },
    cargaMinOhm: null,
    sensEntradaMv: null,
    impedanciaEntradaOhm: null,
    factorAmortiguamiento: null,
  };
  const r = evaluarCarga(kef, ampReserva);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'cubierto');
});

test('impedancia mínima > 4Ω es carga benigna sin importar el ampli', () => {
  const parlanteBenigno: Parlante = { ...kef, impedanciaMinOhm: 5.76 };
  const ampDebil: Amplificador = {
    ...rega,
    potencia8OhmW: { valor: 20, fuente: 'test', confianza: 'alta' },
    potencia4OhmW: null,
  };
  const r = evaluarCarga(parlanteBenigno, ampDebil);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'carga-benigna');
});

test('límite exacto minZ=4 cuenta como "dura" (≤4, cerrado por abajo)', () => {
  const parlanteLimite: Parlante = { ...kef, impedanciaMinOhm: 4 };
  const r = evaluarCarga(parlanteLimite, rega); // rega no resuelve (50<60, ratio 1.46<1.7)
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'exige-corriente');
});

test('límite exacto p8=60 cuenta como "potente" (≥60, cerrado por abajo)', () => {
  const ampLimite: Amplificador = { ...rega, potencia8OhmW: { valor: 60, fuente: 'test', confianza: 'alta' }, potencia4OhmW: null };
  const r = evaluarCarga(kef, ampLimite);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'cubierto');
});

test('límite exacto ratio p4/p8=1.7 cuenta como "reserva" (≥1.7, cerrado por abajo)', () => {
  const ampLimite: Amplificador = {
    ...rega,
    potencia8OhmW: { valor: 40, fuente: 'test', confianza: 'alta' },
    potencia4OhmW: { valor: 68, fuente: 'test', confianza: 'alta' }, // 68/40 = 1.7 exacto
  };
  const r = evaluarCarga(kef, ampLimite);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'cubierto');
});

// ---- EPDR (equivalent peak dissipation resistance) ----

test('EPDR: condición de frontera θ=0° → EPDR = impedanciaMinOhm exacto (carga puramente resistiva, sin estrés extra)', () => {
  const parlante: Parlante = { ...kef, anguloFaseGrados: 0, impedanciaMinOhm: 3.5 };
  const r = evaluarCarga(parlante, cambridge); // cambridge resuelve (potente: 80≥60) → severidadBase 'ok'
  assert.equal(r.thetaGrados, 0);
  assert.equal(r.thetaEsSupuesto, false);
  assert.ok(r.epdrOhm !== null);
  assert.ok(Math.abs(r.epdrOhm! - 3.5) < 1e-9, `epdrOhm=${r.epdrOhm}`);
});

test('EPDR: sin ángulo publicado y nominal >4 Ω → no se calcula EPDR, sólo cuenta la reserva de corriente (regresión)', () => {
  const r = evaluarCarga(kef, cambridge); // kef: nominal 8 Ω, anguloFaseGrados null
  assert.equal(r.thetaGrados, null);
  assert.equal(r.epdrOhm, null);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'cubierto');
});

test('EPDR: ángulo de fase real más exigente que el fallback → "epdr-ajustado" (warn) aunque la reserva de corriente esté cubierta', () => {
  // |Z|=4,3 Ω, θ=-60° (vector de referencia tipo B&W Nautilus 802): EPDR = 4,3/(1+sen60°) ≈ 2,304 Ω → [2,3) → warn
  const parlante: Parlante = { ...kef, impedanciaMinOhm: 4.3, anguloFaseGrados: -60 };
  const r = evaluarCarga(parlante, cambridge); // cambridge resuelve → severidadBase 'ok'
  assert.equal(r.thetaEsSupuesto, false);
  assert.ok(r.epdrOhm !== null && r.epdrOhm > 2 && r.epdrOhm < 3, `epdrOhm=${r.epdrOhm}`);
  assert.ok(r.epdrOhm! >= EPDR_ALERT_OHM && r.epdrOhm! < EPDR_WARN_OHM);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'epdr-ajustado');
});

test('EPDR: ángulo de fase muy exigente → "epdr-critico" (alert), un nivel que carga.ts no tenía antes de EPDR', () => {
  // |Z|=3,0 Ω, θ=-75°: EPDR = 3,0/(1+sen75°) ≈ 1,526 Ω → <2,0 → alert
  const parlante: Parlante = { ...kef, impedanciaMinOhm: 3.0, anguloFaseGrados: -75 };
  const r = evaluarCarga(parlante, cambridge);
  assert.ok(r.epdrOhm !== null && r.epdrOhm < EPDR_ALERT_OHM, `epdrOhm=${r.epdrOhm}`);
  assert.equal(r.severidad, 'alert');
  assert.equal(r.codigo, 'epdr-critico');
});

test('EPDR: sin ángulo publicado, nominal ≤4 Ω → fallback de -45° (criterio del sitio, declarado como supuesto)', () => {
  const parlante: Parlante = { ...kef, impedanciaNominalOhm: 4, impedanciaMinOhm: 3.0, anguloFaseGrados: null };
  const r = evaluarCarga(parlante, cambridge);
  assert.equal(r.thetaGrados, FASE_SUPUESTA_GRADOS);
  assert.equal(r.thetaEsSupuesto, true);
  // EPDR = 3,0/(1+sen45°) ≈ 1,757 Ω → <2,0 → alert
  assert.ok(r.epdrOhm !== null && r.epdrOhm < EPDR_ALERT_OHM, `epdrOhm=${r.epdrOhm}`);
  assert.equal(r.severidad, 'alert');
  assert.equal(r.codigo, 'epdr-critico');
});

test('EPDR: fase moderada (θ=-30°, |Z|=5) da EPDR≥3,0 → "ok", no cambia la severidad base', () => {
  const parlante: Parlante = { ...kef, impedanciaMinOhm: 5, anguloFaseGrados: -30 };
  const r = evaluarCarga(parlante, cambridge);
  assert.ok(r.epdrOhm !== null && r.epdrOhm >= EPDR_WARN_OHM, `epdrOhm=${r.epdrOhm}`);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'carga-benigna'); // impedanciaMinOhm=5 > 4 ⇒ "dura" es false, codigoBase ya era "carga-benigna"
});

test('EPDR: severidadBase ya "warn" (exige-corriente) y EPDR también "alert" → gana "alert"/"epdr-critico", peor-de-los-dos', () => {
  const parlante: Parlante = { ...kef, impedanciaMinOhm: 3.0, anguloFaseGrados: -75 };
  const r = evaluarCarga(parlante, rega); // rega NO resuelve (50<60, ratio 1,46<1,7) → severidadBase 'warn'
  assert.equal(r.severidad, 'alert'); // alert > warn
  assert.equal(r.codigo, 'epdr-critico');
});

test('EPDR: severidadBase "warn" y EPDR "ok" → se queda en "warn"/"exige-corriente" (EPDR no mejora un problema real)', () => {
  const parlante: Parlante = { ...kef, impedanciaMinOhm: 5, anguloFaseGrados: -10 }; // fase benigna, EPDR alto
  const r = evaluarCarga(parlante, rega);
  assert.equal(r.severidad, 'ok'); // impedanciaMinOhm=5 > 4 ⇒ no es "dura" en absoluto
  // caso de control: forzar "dura" con impedanciaMinOhm=4 y fase benigna
  const parlanteDuro: Parlante = { ...kef, impedanciaMinOhm: 4, anguloFaseGrados: -10 };
  const r2 = evaluarCarga(parlanteDuro, rega);
  assert.ok(r2.epdrOhm !== null && r2.epdrOhm >= EPDR_WARN_OHM, `epdrOhm=${r2.epdrOhm}`);
  assert.equal(r2.severidad, 'warn');
  assert.equal(r2.codigo, 'exige-corriente'); // el código lo sigue explicando la reserva de corriente, no EPDR
});
