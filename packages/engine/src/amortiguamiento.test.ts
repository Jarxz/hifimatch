import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarAmortiguamiento, ZMAX_SUPUESTO_OHM, DELTA_DB_OPTIMO_MAX, DELTA_DB_WARN_MAX } from './amortiguamiento.ts';
import type { Parlante, Amplificador } from './tipos.ts';

const EPS = 0.001;

const parlanteBase: Parlante = {
  id: 'test-spk',
  nombre: 'Parlante de prueba',
  tipo: 'sintético para test',
  sensibilidadDb: { valor: 87, fuente: 'test', confianza: 'alta' },
  impedanciaNominalOhm: 8,
  impedanciaMinOhm: 4,
  potenciaRecMinW: null,
  potenciaRecMaxW: null,
  anguloFaseGrados: null,
  impedanciaMaxOhm: null, // sin dato ⇒ usa el fallback de 25 Ω
};

const ampBase: Amplificador = {
  id: 'test-amp',
  nombre: 'Amplificador de prueba',
  tipo: 'sintético para test',
  potencia8OhmW: { valor: 60, fuente: 'test', confianza: 'alta' },
  potencia4OhmW: null,
  cargaMinOhm: null,
  sensEntradaMv: null,
  impedanciaEntradaOhm: null,
  factorAmortiguamiento: null,
};

function conDf(df: number): Amplificador {
  return { ...ampBase, factorAmortiguamiento: df };
}

test('sin factorAmortiguamiento publicado → "sin-datos" (regla lista, catálogo todavía sin este campo poblado)', () => {
  const r = evaluarAmortiguamiento(parlanteBase, ampBase);
  assert.equal(r.severidad, 'sin-datos');
  assert.equal(r.codigo, 'sin-dato');
  assert.equal(r.deltaDb, null);
});

test('sin impedanciaMinOhm del parlante → "sin-datos" aunque el ampli sí tenga DF', () => {
  const r = evaluarAmortiguamiento({ ...parlanteBase, impedanciaMinOhm: null }, conDf(20));
  assert.equal(r.severidad, 'sin-datos');
});

test('Zout = 8/DF exacto', () => {
  const r = evaluarAmortiguamiento(parlanteBase, conDf(20));
  assert.ok(Math.abs(r.zOutOhm! - 0.4) < 1e-9);
});

test('sin impedanciaMaxOhm publicada → usa el fallback de 25 Ω, declarado con zMaxEsSupuesto=true', () => {
  const r = evaluarAmortiguamiento(parlanteBase, conDf(20));
  assert.equal(r.zMaxOhm, ZMAX_SUPUESTO_OHM);
  assert.equal(r.zMaxEsSupuesto, true);
});

test('con impedanciaMaxOhm publicada → se usa el dato real, no el fallback', () => {
  const r = evaluarAmortiguamiento({ ...parlanteBase, impedanciaMinOhm: 3, impedanciaMaxOhm: 30 }, conDf(10));
  assert.equal(r.zMaxOhm, 30);
  assert.equal(r.zMaxEsSupuesto, false);
  // vector recalculado con node: deltaDb(30,3,0.8) ≈ 1,8247 dB → "critico"
  assert.ok(Math.abs(r.deltaDb! - 1.8247) < EPS, `deltaDb=${r.deltaDb}`);
  assert.equal(r.severidad, 'alert');
  assert.equal(r.codigo, 'critico');
});

test('DF alto (amplificador de estado sólido bien amortiguado) → ΔdB≈0 → "óptimo"', () => {
  const r = evaluarAmortiguamiento(parlanteBase, conDf(1000));
  assert.ok(Math.abs(r.deltaDb! - 0.014575) < EPS, `deltaDb=${r.deltaDb}`);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'optimo');
});

test('DF=100 → ΔdB≈0,144 dB → "óptimo"', () => {
  const r = evaluarAmortiguamiento(parlanteBase, conDf(100));
  assert.ok(Math.abs(r.deltaDb! - 0.144253) < EPS, `deltaDb=${r.deltaDb}`);
  assert.equal(r.codigo, 'optimo');
});

test('frontera de DELTA_DB_OPTIMO_MAX (0,3 dB): DF=47,5 (ΔdB≈0,2999, justo debajo) → "óptimo"; DF=45 (ΔdB≈0,3162, justo encima) → "con-reparos"', () => {
  const debajo = evaluarAmortiguamiento(parlanteBase, conDf(47.5));
  assert.ok(debajo.deltaDb! < DELTA_DB_OPTIMO_MAX, `deltaDb=${debajo.deltaDb}`);
  assert.equal(debajo.codigo, 'optimo');

  const encima = evaluarAmortiguamiento(parlanteBase, conDf(45));
  assert.ok(encima.deltaDb! > DELTA_DB_OPTIMO_MAX, `deltaDb=${encima.deltaDb}`);
  assert.equal(encima.codigo, 'con-reparos');
});

test('DF=20 (amplificador integrado modesto) → ΔdB≈0,690 dB → "con-reparos", warn', () => {
  const r = evaluarAmortiguamiento(parlanteBase, conDf(20));
  assert.ok(Math.abs(r.deltaDb! - 0.689979) < EPS, `deltaDb=${r.deltaDb}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'con-reparos');
});

test('frontera de DELTA_DB_WARN_MAX (1,5 dB): DF=9 (ΔdB≈1,4395, justo debajo) → "con-reparos"; DF=8 (ΔdB≈1,5975, justo encima) → "crítico"', () => {
  const debajo = evaluarAmortiguamiento(parlanteBase, conDf(9));
  assert.ok(debajo.deltaDb! < DELTA_DB_WARN_MAX, `deltaDb=${debajo.deltaDb}`);
  assert.equal(debajo.severidad, 'warn');
  assert.equal(debajo.codigo, 'con-reparos');

  const encima = evaluarAmortiguamiento(parlanteBase, conDf(8));
  assert.ok(encima.deltaDb! > DELTA_DB_WARN_MAX, `deltaDb=${encima.deltaDb}`);
  assert.equal(encima.severidad, 'alert');
  assert.equal(encima.codigo, 'critico');
});

test('DF muy bajo (electrónica valvular típica, DF=4) → ΔdB≈2,853 dB → "crítico" — no penaliza el DF bajo en sí, penaliza la interacción real con la curva de este parlante', () => {
  const r = evaluarAmortiguamiento(parlanteBase, conDf(4));
  assert.ok(Math.abs(r.deltaDb! - 2.85335) < EPS, `deltaDb=${r.deltaDb}`);
  assert.equal(r.severidad, 'alert');
  assert.equal(r.codigo, 'critico');
});

test('DF bajo con una curva de impedancia benigna (Zmin y Zmax muy cercanos) puede seguir siendo "óptimo" — no hay una regla "DF bajo = malo" aislada', () => {
  // Zmin=Zmax=8 (parlante resistivo puro, sin variación): el divisor de tensión
  // no cambia entre el mínimo y el máximo porque son el mismo valor → ΔdB=0
  // siempre, sin importar cuán bajo sea el DF.
  const parlanteResistivo: Parlante = { ...parlanteBase, impedanciaMinOhm: 8, impedanciaMaxOhm: 8 };
  const r = evaluarAmortiguamiento(parlanteResistivo, conDf(4)); // mismo DF bajo que el test "crítico" de arriba
  assert.ok(Math.abs(r.deltaDb! - 0) < 1e-9, `deltaDb=${r.deltaDb}`);
  assert.equal(r.codigo, 'optimo');
});

test('severidad nunca deja "sin-datos" fuera del caso sin datos (siempre ok/warn/alert cuando hay dato)', () => {
  const dfs = [4, 8, 9, 20, 45, 47.5, 100, 1000];
  for (const df of dfs) {
    const r = evaluarAmortiguamiento(parlanteBase, conDf(df));
    assert.ok(['ok', 'warn', 'alert'].includes(r.severidad), `severidad inesperada: ${r.severidad}`);
  }
});
