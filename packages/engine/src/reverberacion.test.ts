import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluarReverberacion,
  ABSORCION_MURO_BANDAS,
  ABSORCION_PISO_BANDAS,
  ABSORCION_TECHO_BANDAS,
  BANDAS_HZ,
  UMBRAL_EYRING_ALPHA,
  RT60_MIN_OK_S,
  RT60_MAX_OK_S,
} from './reverberacion.ts';
import type { Sala } from './sala.ts';
import type { Materiales } from './reverberacion.ts';

const EPS = 0.0005;
const SALA_VECTOR: Sala = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 }; // misma sala por defecto que sala.ts/modos.ts

const TIPICOS: Materiales = {
  muroFrontal: 'yesoCarton',
  muroPosterior: 'yesoCarton',
  muroIzquierdo: 'yesoCarton',
  muroDerecho: 'yesoCarton',
  piso: 'maderaLaminado',
  techo: 'yesoCarton',
};

test('vector de sala por defecto, los 4 muros yeso cartón + piso madera laminado + techo yeso cartón: 125 Hz cruza a Eyring, 500/2000 Hz quedan en Sabine', () => {
  // Superficies: S_frontal=S_posterior=3,6×2,4=8,64 m²; S_izq=S_der=5,0×2,4=12,00 m²;
  // S_piso=S_techo=18,00 m²; S_total=77,28 m²; V=43,2 m³.
  // Vectores recalculados con node (ver comentario de cabecera de reverberacion.ts para la fórmula):
  //   125 Hz: ᾱ=0,231770 (>0,20 → Eyring) → RT60≈0,341340 s
  //   500 Hz: ᾱ=0,093012 (≤0,20 → Sabine) → RT60≈0,967613 s
  //  2000 Hz: ᾱ=0,044658 (≤0,20 → Sabine) → RT60≈2,015299 s
  // RT60 final = (0,967613+2,015299)/2 ≈ 1,491456 s → > 0,6 → "warn"/rt60-largo
  // (misma sala que antes daba "muy viva" bajo el modelo de una sola banda — sigue
  // dando "muy viva" bajo el modelo de 3 bandas, sin regresión de clasificación)
  const r = evaluarReverberacion(SALA_VECTOR, TIPICOS);
  assert.ok(Math.abs(r.volumenM3 - 43.2) < EPS);
  assert.ok(Math.abs(r.superficieFrontalM2 - 8.64) < EPS);
  assert.ok(Math.abs(r.superficieIzquierdaM2 - 12) < EPS);
  assert.ok(Math.abs(r.superficieTotalM2 - 77.28) < EPS);
  assert.equal(r.bandas.length, 3);
  assert.deepEqual(r.bandas.map((b) => b.hz), [...BANDAS_HZ]);

  const b125 = r.bandas[0]!;
  assert.ok(Math.abs(b125.alphaBar - 0.23177) < EPS, `alphaBar125=${b125.alphaBar}`);
  assert.equal(b125.metodo, 'eyring');
  assert.ok(Math.abs(b125.rt60S - 0.341340) < EPS, `rt60_125=${b125.rt60S}`);

  const b500 = r.bandas[1]!;
  assert.ok(Math.abs(b500.alphaBar - 0.093012) < EPS, `alphaBar500=${b500.alphaBar}`);
  assert.equal(b500.metodo, 'sabine');
  assert.ok(Math.abs(b500.rt60S - 0.967613) < EPS, `rt60_500=${b500.rt60S}`);

  const b2000 = r.bandas[2]!;
  assert.ok(Math.abs(b2000.alphaBar - 0.044658) < EPS, `alphaBar2000=${b2000.alphaBar}`);
  assert.equal(b2000.metodo, 'sabine');
  assert.ok(Math.abs(b2000.rt60S - 2.015299) < EPS, `rt60_2000=${b2000.rt60S}`);

  assert.ok(Math.abs(r.rt60S - 1.491456) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'rt60-largo');

  // Frecuencia de Schroeder: fs = 2000·√(RT60/V) = 2000·√(1,491456/43,2) ≈ 371,615 Hz
  assert.ok(Math.abs(r.frecuenciaSchroederHz - 371.615) < 0.01, `fs=${r.frecuenciaSchroederHz}`);
});

test('el RT60 final (banda 500+2000 Hz) coincide con el promedio simple reportado, no un cálculo aparte', () => {
  const r = evaluarReverberacion(SALA_VECTOR, TIPICOS);
  const promedio = (r.bandas[1]!.rt60S + r.bandas[2]!.rt60S) / 2;
  assert.ok(Math.abs(r.rt60S - promedio) < 1e-9);
});

test('muro frontal "vacío" (abertura/pasillo): α=1,0 en las 3 bandas, baja el RT60 final a rango cómodo', () => {
  // Vectores recalculados: 125 Hz ᾱ=0,311149 (Eyring, RT60≈0,241461 s);
  // 500 Hz ᾱ=0,193634 (Sabine, RT60≈0,464796 s); 2000 Hz ᾱ=0,151988 (Sabine, RT60≈0,592154 s).
  // RT60 final = (0,464796+0,592154)/2 ≈ 0,528475 s → dentro de 0,3–0,6 → "ok"
  assert.deepEqual(ABSORCION_MURO_BANDAS.vacio, [1.0, 1.0, 1.0]);
  const materiales: Materiales = { ...TIPICOS, muroFrontal: 'vacio' };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  assert.ok(Math.abs(r.rt60S - 0.528475) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'ok');
  assert.equal(r.codigo, 'rt60-ok');
});

test('sala muy tratada (panel acústico en frontal/posterior/techo, madera en laterales, alfombra en piso): 500 y 2000 Hz cruzan a Eyring → "warn" (rt60-corto)', () => {
  // Vectores recalculados: 125 Hz ᾱ=0,165373 (Sabine, RT60≈0,544225 s);
  // 500 Hz ᾱ=0,451708 (Eyring, RT60≈0,149764 s); 2000 Hz ᾱ=0,575466 (Eyring, RT60≈0,105047 s).
  // RT60 final = (0,149764+0,105047)/2 ≈ 0,127405 s → < 0,3 → "warn"/rt60-corto
  const materiales: Materiales = {
    muroFrontal: 'panelAcustico',
    muroPosterior: 'panelAcustico',
    muroIzquierdo: 'madera',
    muroDerecho: 'madera',
    piso: 'alfombra',
    techo: 'panelAcustico',
  };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  assert.equal(r.bandas[0]!.metodo, 'sabine');
  assert.equal(r.bandas[1]!.metodo, 'eyring');
  assert.equal(r.bandas[2]!.metodo, 'eyring');
  assert.ok(Math.abs(r.rt60S - 0.127405) < EPS, `rt60S=${r.rt60S}`);
  assert.equal(r.severidad, 'warn');
  assert.equal(r.codigo, 'rt60-corto');
});

test('los 4 muros son independientes: cambiar sólo uno cambia el resultado, los otros tres no fuerzan el mismo material', () => {
  const base = evaluarReverberacion(SALA_VECTOR, TIPICOS);
  const conVidrioFrontal = evaluarReverberacion(SALA_VECTOR, { ...TIPICOS, muroFrontal: 'vidrio' });
  assert.notEqual(base.absorcionTotalSabines, conVidrioFrontal.absorcionTotalSabines);
  assert.ok(Math.abs(conVidrioFrontal.absorcionPosteriorSabines - base.absorcionPosteriorSabines) < EPS);
  assert.ok(Math.abs(conVidrioFrontal.absorcionIzquierdaSabines - base.absorcionIzquierdaSabines) < EPS);
  assert.ok(Math.abs(conVidrioFrontal.absorcionDerechaSabines - base.absorcionDerechaSabines) < EPS);
});

test('absorción a 500 Hz (banda de referencia del desglose) es la suma de las 6 superficies, no un promedio ni un coeficiente único', () => {
  const materiales: Materiales = {
    muroFrontal: 'vidrio',
    muroPosterior: 'hormigon',
    muroIzquierdo: 'madera',
    muroDerecho: 'yesoCarton',
    piso: 'porcelanato',
    techo: 'hormigon',
  };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  const idx500 = 1;
  const esperado =
    ABSORCION_MURO_BANDAS.vidrio[idx500] * r.superficieFrontalM2 +
    ABSORCION_MURO_BANDAS.hormigon[idx500] * r.superficiePosteriorM2 +
    ABSORCION_MURO_BANDAS.madera[idx500] * r.superficieIzquierdaM2 +
    ABSORCION_MURO_BANDAS.yesoCarton[idx500] * r.superficieDerechaM2 +
    ABSORCION_PISO_BANDAS.porcelanato[idx500] * r.superficiePisoM2 +
    ABSORCION_TECHO_BANDAS.hormigon[idx500] * r.superficieTechoM2;
  assert.ok(Math.abs(r.absorcionTotalSabines - esperado) < 1e-9);
  assert.ok(Math.abs(r.bandas[1]!.alphaBar * r.superficieTotalM2 - esperado) < 1e-9);
});

test('frontera de RT60_MIN_OK_S cerrada por abajo: justo encima → "ok", justo debajo → "warn" (cubo de hormigón, las 3 bandas en Sabine)', () => {
  // Sala cúbica (W=L=H=s), las 6 superficies en hormigón: ᾱ_500=ᾱ_2000=0,02 (≤0,20 → Sabine
  // en las dos bandas que promedian el RT60 final). S_total=6s², A=0,02·6s²,
  // RT60=(0,161/(6·0,02))·s, lineal en s → s = RT60·6·0,02/0,161.
  const alpha500 = ABSORCION_MURO_BANDAS.hormigon[1];
  assert.equal(alpha500, ABSORCION_PISO_BANDAS.hormigon[1]);
  assert.equal(alpha500, ABSORCION_TECHO_BANDAS.hormigon[1]);
  assert.ok(alpha500 <= UMBRAL_EYRING_ALPHA);
  const materiales: Materiales = {
    muroFrontal: 'hormigon',
    muroPosterior: 'hormigon',
    muroIzquierdo: 'hormigon',
    muroDerecho: 'hormigon',
    piso: 'hormigon',
    techo: 'hormigon',
  };
  const sLado = (rt60Objetivo: number) => (rt60Objetivo * 6 * alpha500) / 0.161;

  const sEncima = sLado(RT60_MIN_OK_S + 0.001);
  const rEncima = evaluarReverberacion({ anchoM: sEncima, largoM: sEncima, altoM: sEncima }, materiales);
  assert.equal(rEncima.severidad, 'ok');
  assert.equal(rEncima.codigo, 'rt60-ok');

  const sDebajo = sLado(RT60_MIN_OK_S - 0.001);
  const rDebajo = evaluarReverberacion({ anchoM: sDebajo, largoM: sDebajo, altoM: sDebajo }, materiales);
  assert.equal(rDebajo.severidad, 'warn');
  assert.equal(rDebajo.codigo, 'rt60-corto');
});

test('ᾱ > UMBRAL_EYRING_ALPHA cruza a Eyring, que predice un RT60 menor que el que Sabine hubiera dado para la misma ᾱ (Sabine sobreestima en alta absorción)', () => {
  const materiales: Materiales = {
    muroFrontal: 'panelAcustico',
    muroPosterior: 'panelAcustico',
    muroIzquierdo: 'panelAcustico',
    muroDerecho: 'panelAcustico',
    piso: 'alfombra',
    techo: 'panelAcustico',
  };
  const r = evaluarReverberacion(SALA_VECTOR, materiales);
  for (const b of [r.bandas[1]!, r.bandas[2]!]) {
    assert.ok(b.alphaBar > UMBRAL_EYRING_ALPHA, `alphaBar=${b.alphaBar} debería superar el umbral`);
    assert.equal(b.metodo, 'eyring');
    const rt60SabineIngenuo = (0.161 * r.volumenM3) / (r.superficieTotalM2 * b.alphaBar);
    assert.ok(b.rt60S < rt60SabineIngenuo, `Eyring (${b.rt60S}) debería ser menor que Sabine ingenuo (${rt60SabineIngenuo})`);
    assert.ok(b.rt60S > 0);
  }
});

test('severidad nunca es "error"/"alert" — techo declarado por CLAUDE.md para reglas de sala', () => {
  const salas: Sala[] = [
    { anchoM: 2.5, largoM: 3.0, altoM: 2.2 },
    { anchoM: 3.6, largoM: 5.0, altoM: 2.4 },
    { anchoM: 7, largoM: 9, altoM: 3.5 },
  ];
  const combos: Materiales[] = [
    TIPICOS,
    { ...TIPICOS, muroFrontal: 'vacio', muroPosterior: 'vacio' },
    { muroFrontal: 'vacio', muroPosterior: 'vacio', muroIzquierdo: 'vacio', muroDerecho: 'vacio', piso: 'alfombra', techo: 'panelAcustico' },
    { muroFrontal: 'panelAcustico', muroPosterior: 'panelAcustico', muroIzquierdo: 'panelAcustico', muroDerecho: 'panelAcustico', piso: 'alfombra', techo: 'panelAcustico' },
  ];
  for (const sala of salas) {
    for (const materiales of combos) {
      const r = evaluarReverberacion(sala, materiales);
      assert.notEqual(r.severidad as string, 'error');
      assert.notEqual(r.severidad as string, 'alert');
      for (const b of r.bandas) {
        assert.ok(Number.isFinite(b.rt60S) && b.rt60S > 0, `rt60S de banda ${b.hz} Hz no es finito/positivo: ${b.rt60S}`);
      }
    }
  }
});

test('RT60_MIN_OK_S y RT60_MAX_OK_S están declarados y RT60_MIN < RT60_MAX', () => {
  assert.ok(RT60_MIN_OK_S > 0);
  assert.ok(RT60_MIN_OK_S < RT60_MAX_OK_S);
});

test('UMBRAL_EYRING_ALPHA es 0,20 (criterio de literatura de acústica arquitectónica, no inventado)', () => {
  assert.equal(UMBRAL_EYRING_ALPHA, 0.2);
});

test('techo (4 materiales) reusa exactamente los coeficientes de muro — misma superficie física, misma absorción sin importar orientación', () => {
  assert.deepEqual(ABSORCION_TECHO_BANDAS.hormigon, ABSORCION_MURO_BANDAS.hormigon);
  assert.deepEqual(ABSORCION_TECHO_BANDAS.madera, ABSORCION_MURO_BANDAS.madera);
  assert.deepEqual(ABSORCION_TECHO_BANDAS.yesoCarton, ABSORCION_MURO_BANDAS.yesoCarton);
  assert.deepEqual(ABSORCION_TECHO_BANDAS.panelAcustico, ABSORCION_MURO_BANDAS.panelAcustico);
});
