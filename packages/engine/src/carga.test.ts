import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarCarga } from './carga.ts';
import type { Parlante, Amplificador } from './tipos.ts';

// Mismos fixtures que potencia.test.ts (= data/equipos-seed.json).
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

test('KEF (minZ 3,5) + Cambridge CXA81 (80/120): dura, potente (80≥60) → Cubierto', () => {
  const r = evaluarCarga(kef, cambridge);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.etiqueta, 'Cubierto');
});

test('KEF (minZ 3,5) + Rega Brio (50/73): dura, reserva 1,46<1,7, no potente (50<60) → Exige corriente', () => {
  const r = evaluarCarga(kef, rega);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.etiqueta, 'Exige corriente');
});

test('Klipsch (minZ null) + cualquier ampli → Sin dato', () => {
  const r1 = evaluarCarga(klipsch, cambridge);
  const r2 = evaluarCarga(klipsch, rega);
  assert.equal(r1.severidad, 'sin-datos');
  assert.equal(r1.etiqueta, 'Sin dato');
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
  };
  const r = evaluarCarga(kef, ampMediocre);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.etiqueta, 'Exige corriente');
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
  };
  const r = evaluarCarga(kef, ampReserva);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.etiqueta, 'Cubierto');
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
  assert.equal(r.etiqueta, 'Carga benigna');
});

test('límite exacto minZ=4 cuenta como "dura" (≤4, cerrado por abajo)', () => {
  const parlanteLimite: Parlante = { ...kef, impedanciaMinOhm: 4 };
  const r = evaluarCarga(parlanteLimite, rega); // rega no resuelve (50<60, ratio 1.46<1.7)
  assert.equal(r.severidad, 'warn');
  assert.equal(r.etiqueta, 'Exige corriente');
});

test('límite exacto p8=60 cuenta como "potente" (≥60, cerrado por abajo)', () => {
  const ampLimite: Amplificador = { ...rega, potencia8OhmW: { valor: 60, fuente: 'test', confianza: 'alta' }, potencia4OhmW: null };
  const r = evaluarCarga(kef, ampLimite);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.etiqueta, 'Cubierto');
});

test('límite exacto ratio p4/p8=1.7 cuenta como "reserva" (≥1.7, cerrado por abajo)', () => {
  const ampLimite: Amplificador = {
    ...rega,
    potencia8OhmW: { valor: 40, fuente: 'test', confianza: 'alta' },
    potencia4OhmW: { valor: 68, fuente: 'test', confianza: 'alta' }, // 68/40 = 1.7 exacto
  };
  const r = evaluarCarga(kef, ampLimite);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.etiqueta, 'Cubierto');
});
