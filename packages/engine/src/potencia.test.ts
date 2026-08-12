import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarPotencia } from './potencia.ts';
import type { Parlante, Amplificador } from './tipos.ts';

const EPS = 0.05; // tolerancia estándar del proyecto (motor-mvp.md, cabecera)

// Fixtures = data/equipos-seed.json (mismos valores, mismas fuentes).
const klipsch: Parlante = {
  id: 'klipsch-rp600m-ii',
  nombre: 'Klipsch RP-600M II',
  tipo: 'Monitor de 2 vías, trompa Tractrix, puerto trasero',
  sensibilidadDb: { valor: 86, fuente: "Erin's Audio Corner (anecoica)", confianza: 'media' },
  impedanciaNominalOhm: 8,
  impedanciaMinOhm: null,
  potenciaRecMinW: null,
  potenciaRecMaxW: 100,
};

const kef: Parlante = {
  id: 'kef-ls50-meta',
  nombre: 'KEF LS50 Meta',
  tipo: 'Monitor de 2 vías, puerto trasero, driver coaxial Uni-Q',
  sensibilidadDb: { valor: 85, fuente: 'KEF (ficha)', confianza: 'alta' },
  impedanciaNominalOhm: 8,
  impedanciaMinOhm: 3.5,
  potenciaRecMinW: 40,
  potenciaRecMaxW: 100,
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
};

test('Vector A — Klipsch + Cambridge CXA81, 2.5m, alto: margen +6,07 → Con margen', () => {
  const r = evaluarPotencia(klipsch, cambridge, 2.5, 'alto');
  assert.ok(Math.abs(r.splDisponibleDb - 106.07) < EPS);
  assert.ok(Math.abs(r.margenDb - 6.07) < EPS);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.etiqueta, 'Con margen');
  // confianza: peor(media de sensibilidad, alta de potencia) = media
  assert.equal(r.confianza, 'media');
});

test('Vector B — KEF + Rega Brio, 3.0m, alto: margen +1,45 → Justo', () => {
  const r = evaluarPotencia(kef, rega, 3.0, 'alto');
  assert.ok(Math.abs(r.splDisponibleDb - 101.45) < EPS);
  assert.ok(Math.abs(r.margenDb - 1.45) < EPS);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.etiqueta, 'Justo');
  assert.equal(r.confianza, 'alta');
});

test('Vector C — KEF + Rega Brio, 3.0m, referencia: margen −3,55 → Insuficiente', () => {
  const r = evaluarPotencia(kef, rega, 3.0, 'referencia');
  assert.ok(Math.abs(r.margenDb - -3.55) < EPS);
  assert.equal(r.severidad, 'alert');
  assert.equal(r.etiqueta, 'Insuficiente');
});

test('Rega Brio (50W) no dispara aviso de potenciaRecMinW de KEF (40W): 50 ≥ 40', () => {
  const r = evaluarPotencia(kef, rega, 3.0, 'alto');
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
  };
  // KEF pide desde 40W (potenciaRecMinW); este ampli da 30W < 40W.
  const r = evaluarPotencia(kef, ampSubpotente, 2.5, 'moderado');
  assert.equal(r.avisos.length, 1);
  assert.match(r.avisos[0]!, /40/);
});

test('límite exacto margen=3 cae en "ok", no en "warn" (frontera cerrada por arriba)', () => {
  // sens=90, p8=1W, dist=1m, nivel=moderado(90): SPL = 90 - 0 + 0 + 6 + 3 = 99, margen = 9
  // Se arma un caso más ajustado a mano para tocar exactamente el límite:
  // Con dist=1, p8=1 (0dB cada término), SPL = sens + 9. Para margen=3 con peak=90: sens = 90-9+3 = 84
  const parlanteLimite: Parlante = { ...kef, sensibilidadDb: { valor: 84, fuente: 'test', confianza: 'alta' } };
  const ampUnitario: Amplificador = { ...cambridge, potencia8OhmW: { valor: 1, fuente: 'test', confianza: 'alta' } };
  const r = evaluarPotencia(parlanteLimite, ampUnitario, 1, 'moderado');
  assert.ok(Math.abs(r.margenDb - 3) < EPS);
  assert.equal(r.severidad, 'ok');
});

test('límite exacto margen=0 cae en "warn", no en "alert" (frontera cerrada por arriba)', () => {
  const parlanteLimite: Parlante = { ...kef, sensibilidadDb: { valor: 81, fuente: 'test', confianza: 'alta' } };
  const ampUnitario: Amplificador = { ...cambridge, potencia8OhmW: { valor: 1, fuente: 'test', confianza: 'alta' } };
  const r = evaluarPotencia(parlanteLimite, ampUnitario, 1, 'moderado');
  assert.ok(Math.abs(r.margenDb - 0) < EPS);
  assert.equal(r.severidad, 'warn');
});
