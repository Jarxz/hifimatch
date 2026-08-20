import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from './ganancia.ts';
import type { Amplificador, Fuente } from './tipos.ts';

// Fixtures = packages/data/src/catalogo.ts (streamers, dacs, amplificadores).
const toppingE30ii: Fuente = {
  id: 'topping-e30-ii',
  nombre: 'Topping E30 II',
  tipo: 'DAC de escritorio, sólo RCA (sin XLR)',
  salidaV: 2.1,
  impedanciaSalidaOhm: 20,
  fuente: 'Topping (ficha oficial)',
  confianza: 'alta',
};

const schiitModiPlus: Fuente = {
  id: 'schiit-modi-plus',
  nombre: 'Schiit Modi+',
  tipo: 'DAC de escritorio, USB/coaxial/óptico',
  salidaV: 2.0,
  impedanciaSalidaOhm: 75,
  fuente: 'Schiit (ficha oficial)',
  confianza: 'alta',
};

const bluesoundNode: Fuente = {
  id: 'bluesound-node-n130',
  nombre: 'Bluesound Node (N130, 2021)',
  tipo: 'Streamer de red con DAC integrado (salida analógica)',
  salidaV: 2.2,
  impedanciaSalidaOhm: 500,
  fuente: 'Bluesound (ficha, vía documentación de soporte)',
  confianza: 'media',
};

const cambridgeCxnV2: Fuente = {
  id: 'cambridge-cxn-v2',
  nombre: 'Cambridge Audio CXN (V2)',
  tipo: 'Streamer de red con DAC integrado, salida RCA y XLR',
  salidaV: null,
  impedanciaSalidaOhm: null,
  fuente: 'Cambridge Audio (ficha oficial)',
  confianza: 'baja',
};

const cambridgeCxa81: Amplificador = {
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

const nad: Amplificador = {
  id: 'nad-c316bee-v2',
  nombre: 'NAD C 316BEE V2',
  tipo: 'Integrado Clase AB, con phono MM',
  potencia8OhmW: { valor: 40, fuente: 'NAD (ficha)', confianza: 'alta' },
  potencia4OhmW: { valor: 40, fuente: 'NAD (ficha)', confianza: 'alta' },
  cargaMinOhm: 2,
  sensEntradaMv: 200,
  impedanciaEntradaOhm: null,
  factorAmortiguamiento: null,
};

const denon: Amplificador = {
  id: 'denon-pma600ne',
  nombre: 'Denon PMA-600NE',
  tipo: 'Integrado Clase AB, con DAC y phono MM',
  potencia8OhmW: { valor: 45, fuente: 'Denon (ficha)', confianza: 'alta' },
  potencia4OhmW: { valor: 70, fuente: 'Denon (ficha)', confianza: 'alta' },
  cargaMinOhm: null,
  sensEntradaMv: 110,
  impedanciaEntradaOhm: 30000,
  factorAmortiguamiento: null,
};

const hegel: Amplificador = {
  id: 'hegel-h95',
  nombre: 'Hegel H95',
  tipo: 'Integrado Clase AB, con DAC',
  potencia8OhmW: { valor: 60, fuente: 'Hegel (ficha)', confianza: 'alta' },
  potencia4OhmW: { valor: 96, fuente: 'SoundStage! / Hi-Fi News (medición)', confianza: 'baja' },
  cargaMinOhm: 2,
  sensEntradaMv: null,
  impedanciaEntradaOhm: null,
  factorAmortiguamiento: null,
};

test('A · Topping E30 II → Cambridge CXA81: ratioZ=2150 → Puente correcto; margenV=5,68 → Recorrido sano', () => {
  const z = evaluarPuenteImpedancias(toppingE30ii, cambridgeCxa81);
  assert.equal(z.severidad, 'ok');
  assert.equal(z.codigo, 'puente-correcto');
  assert.ok(Math.abs((z.ratioZ as number) - 2150) < 0.01);

  const v = evaluarRecorridoVolumen(toppingE30ii, cambridgeCxa81);
  assert.equal(v.severidad, 'ok');
  assert.equal(v.codigo, 'recorrido-sano');
  assert.ok(Math.abs((v.margenV as number) - 5.6757) < 0.01);
});

test('B · Schiit Modi+ → Denon PMA-600NE: ratioZ=400 → Puente correcto; margenV=18,18 → Recorrido corto (caso más exigente)', () => {
  const z = evaluarPuenteImpedancias(schiitModiPlus, denon);
  assert.equal(z.severidad, 'ok');
  assert.equal(z.codigo, 'puente-correcto');

  const v = evaluarRecorridoVolumen(schiitModiPlus, denon);
  assert.equal(v.severidad, 'warn');
  assert.equal(v.codigo, 'recorrido-corto');
  assert.ok(Math.abs((v.margenV as number) - 18.1818) < 0.01);
});

test('C · Bluesound Node → Rega Brio: ratioZ=94 → Puente correcto; margenV=10,48 → Recorrido corto', () => {
  const z = evaluarPuenteImpedancias(bluesoundNode, rega);
  assert.equal(z.severidad, 'ok');
  assert.equal(z.codigo, 'puente-correcto');

  const v = evaluarRecorridoVolumen(bluesoundNode, rega);
  assert.equal(v.severidad, 'warn');
  assert.equal(v.codigo, 'recorrido-corto');
  assert.ok(Math.abs((v.margenV as number) - 10.4762) < 0.01);
});

test('D · NAD C316BEE V2 (impedanciaEntradaOhm null) + Schiit Modi+: sin-datos en puente, pero recorrido corre igual (dato parcial)', () => {
  const z = evaluarPuenteImpedancias(schiitModiPlus, nad);
  assert.equal(z.severidad, 'sin-datos');
  assert.equal(z.codigo, 'sin-dato');
  assert.equal(z.ratioZ, null);

  const v = evaluarRecorridoVolumen(schiitModiPlus, nad);
  assert.equal(v.severidad, 'ok');
  assert.equal(v.codigo, 'recorrido-sano');
  assert.ok(Math.abs((v.margenV as number) - 10) < 0.001); // margenV=10 exacto, límite cerrado por arriba
});

test('E · Cambridge CXN V2 (salidaV e impedanciaSalidaOhm null) + cualquier ampli: sin-datos en ambas subreglas', () => {
  const z = evaluarPuenteImpedancias(cambridgeCxnV2, cambridgeCxa81);
  assert.equal(z.severidad, 'sin-datos');
  const v = evaluarRecorridoVolumen(cambridgeCxnV2, cambridgeCxa81);
  assert.equal(v.severidad, 'sin-datos');
});

test('F · Hegel H95 (sensEntradaMv e impedanciaEntradaOhm null) + cualquier fuente: sin-datos en ambas subreglas', () => {
  const z = evaluarPuenteImpedancias(toppingE30ii, hegel);
  assert.equal(z.severidad, 'sin-datos');
  const v = evaluarRecorridoVolumen(toppingE30ii, hegel);
  assert.equal(v.severidad, 'sin-datos');
});

test('G (sintético) · fuente de 50 mV → Denon PMA-600NE (110 mV): margenV=0,45 → Insuficiente', () => {
  const fuenteDebil: Fuente = {
    id: 'synthetic-50mv',
    nombre: 'Fuente de prueba (50 mV, salida de línea muy débil)',
    tipo: 'sintético para test',
    salidaV: 0.05,
    impedanciaSalidaOhm: 100,
    fuente: 'test',
    confianza: 'alta',
  };
  const v = evaluarRecorridoVolumen(fuenteDebil, denon);
  assert.equal(v.severidad, 'alert');
  assert.equal(v.codigo, 'insuficiente');
  assert.ok(Math.abs((v.margenV as number) - 0.4545) < 0.01);
});

test('H (sintético) · fuente con impedanciaSalidaOhm=15000 → ampli con impedanciaEntradaOhm=10000: ratioZ=0,67 → Puente insuficiente', () => {
  const fuenteAltaZ: Fuente = {
    id: 'synthetic-15000ohm',
    nombre: 'Fuente de prueba (15 kΩ de salida)',
    tipo: 'sintético para test',
    salidaV: 2.0,
    impedanciaSalidaOhm: 15000,
    fuente: 'test',
    confianza: 'alta',
  };
  const ampBajaZEntrada: Amplificador = {
    ...cambridgeCxa81,
    impedanciaEntradaOhm: 10000,
  };
  const z = evaluarPuenteImpedancias(fuenteAltaZ, ampBajaZEntrada);
  assert.equal(z.severidad, 'alert');
  assert.equal(z.codigo, 'puente-insuficiente');
  assert.ok(Math.abs((z.ratioZ as number) - 0.6667) < 0.01);
});

test('límite exacto ratioZ=10 cuenta como "correcto" (≥10, cerrado por abajo)', () => {
  const fuenteLimite: Fuente = { ...toppingE30ii, impedanciaSalidaOhm: 4300 }; // 43000/4300 = 10 exacto
  const z = evaluarPuenteImpedancias(fuenteLimite, cambridgeCxa81);
  assert.equal(z.severidad, 'ok');
  assert.equal(z.codigo, 'puente-correcto');
});

test('límite exacto ratioZ=1 cuenta como "ajustado" (≥1, cerrado por abajo)', () => {
  const fuenteLimite: Fuente = { ...toppingE30ii, impedanciaSalidaOhm: 43000 }; // ratio 1 exacto
  const z = evaluarPuenteImpedancias(fuenteLimite, cambridgeCxa81);
  assert.equal(z.severidad, 'warn');
  assert.equal(z.codigo, 'puente-ajustado');
});

test('límite exacto margenV=1 cuenta como "sano" (≥1, cerrado por abajo)', () => {
  const fuenteLimite: Fuente = { ...toppingE30ii, salidaV: 0.37 }; // 0.37/0.37 = 1 exacto
  const v = evaluarRecorridoVolumen(fuenteLimite, cambridgeCxa81);
  assert.equal(v.severidad, 'ok');
  assert.equal(v.codigo, 'recorrido-sano');
});
