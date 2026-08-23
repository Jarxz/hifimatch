import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarPotencia } from '../../../../packages/engine/src/potencia.ts';
import { evaluarCarga } from '../../../../packages/engine/src/carga.ts';
import { evaluarAmortiguamiento } from '../../../../packages/engine/src/amortiguamiento.ts';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from '../../../../packages/engine/src/ganancia.ts';
import { evaluarModos, evaluarNuloEscucha } from '../../../../packages/engine/src/modos.ts';
import { calcularDisposicion, calcularDisposicionManual } from '../../../../packages/engine/src/sala.ts';
import type { Sala } from '../../../../packages/engine/src/sala.ts';
import { evaluarReverberacion } from '../../../../packages/engine/src/reverberacion.ts';
import type { Materiales } from '../../../../packages/engine/src/reverberacion.ts';
import type { Parlante, Amplificador } from '../../../../packages/engine/src/tipos.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import { parlanteDelCatalogo, amplificadorDelCatalogo, fuenteDelCatalogo } from '../datos/adaptadores.ts';
import { especParlante, especAmplificador, especFuente } from '../datos/etiquetas.ts';
import { calcularVeredicto } from '../../../../packages/engine/src/veredicto.ts';
import type { EntradaVeredicto } from '../../../../packages/engine/src/veredicto.ts';
import type { ClaseVerdicto } from './resultado.ts';
import {
  modeloPotencia,
  modeloCarga,
  modeloAmortiguamiento,
  modeloPuente,
  modeloRecorrido,
  modeloModos,
  modeloReverberacion,
  modeloUbicacionParlantes,
  modeloResumenFinal,
  modeloDocumento,
  modeloVeredicto,
  modeloRecomendacionesTop,
} from './resultado.ts';
import type { ComponenteResumen } from './resultado.ts';
import { num } from '../formato/numeros.ts';

/** 'dim' (pantalla) y 'sin-datos' (motor) son el mismo concepto con otro
 * nombre en cada capa — ver ClaseVerdicto en resultado.ts. */
function claseASeveridad(c: ClaseVerdicto): 'ok' | 'warn' | 'alert' | 'sin-datos' {
  return c === 'dim' ? 'sin-datos' : c;
}

function parlanteCat(id: string): ParlanteCat {
  const p = CATALOGO.parlantes.find((x) => x.id === id);
  if (!p) throw new Error(id);
  return p;
}
function ampCat(id: string): AmplificadorCat {
  const a = CATALOGO.amplificadores.find((x) => x.id === id);
  if (!a) throw new Error(id);
  return a;
}
function fuenteCat(id: string): FuenteCat {
  const f = [...CATALOGO.streamers, ...CATALOGO.dacs].find((x) => x.id === id);
  if (!f) throw new Error(id);
  return f;
}

// Dimensión mayor de sala para evaluarPotencia() — sólo alimenta
// gananciaSalaDb/frecuenciaGananciaSalaHz (informativos, no tocan
// splDisponibleDb/margenDb), así que un valor fijo alcanza para los tests
// que no ejercitan esos dos campos específicamente. Coincide con
// SALA_MODOS/SALA_REVERB de más abajo (3,6×5,0×2,4 → mayor = 5,0).
const DIM_MAYOR_TEST_M = 5.0;

// ---- potencia ----

test('modeloPotencia: severidad "ok" → verdictoClase "ok", nunca "alert"/"dim"', () => {
  const spk = parlanteCat('klipsch-rp600m-ii');
  const amp = ampCat('cambridge-cxa81');
  // 1,0 m (no 2,5 m): tras la corrección del módulo de potencia (SUMA_PAR_DB
  // 6→3, sin GANANCIA_SALA_DB sumada — ver potencia.ts) a 2,5 m este par da
  // "justo", no "con-margen" — se acorta la distancia para seguir
  // ejercitando el caso "con-margen" que este test nombra.
  const r = evaluarPotencia(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'), 1.0, 'alto', DIM_MAYOR_TEST_M);
  const m = modeloPotencia(spk, amp, r, 1.0, 'Alto', 100, 'rockpop', 'es');
  assert.equal(m.verdictoClase, 'ok');
  assert.equal(r.codigo, 'con-margen');
  assert.equal(m.verdictoTexto, 'Con margen');
  assert.match(m.textoHtml, /Alcanza con holgura/);
  // margen +8,03 dB → ratio=10^0,803≈6,35× → % de capacidad usada = 100/6,35≈15,7 → 16
  assert.match(m.simpleHtml, /Potencia superior a la necesaria/);
  assert.match(m.simpleHtml, /16%/);
});

test('modeloPotencia: severidad "alert" → texto de insuficiencia, no de sobra', () => {
  const spk = parlanteCat('kef-ls50-meta');
  const amp = ampCat('rega-brio');
  const r = evaluarPotencia(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'), 3.0, 'referencia', DIM_MAYOR_TEST_M);
  const m = modeloPotencia(spk, amp, r, 3.0, 'Referencia', 105, 'rockpop', 'es');
  assert.equal(m.verdictoClase, 'alert');
  assert.match(m.textoHtml, /Faltan/);
  assert.doesNotMatch(m.textoHtml, /Alcanza con holgura/);
});

test('modeloPotencia: el aviso de potenciaRecMinW aparece sólo cuando el ampli entrega menos de lo recomendado', () => {
  const spkConMinimo: ParlanteCat = {
    ...parlanteCat('kef-ls50-meta'),
    potenciaRecMinW: 40,
  };
  const ampDebil: AmplificadorCat = {
    ...ampCat('rega-brio'),
    id: 'synthetic-30w',
    nombre: 'Amplificador de prueba (30 W)',
    potencia8OhmW: { valor: 30, fuente: { es: 'test', en: 'test' }, confianza: 'alta' },
    potencia4OhmW: null,
  };
  const parlanteM: Parlante = parlanteDelCatalogo(spkConMinimo, 'es');
  const ampM: Amplificador = amplificadorDelCatalogo(ampDebil, 'es');
  const r = evaluarPotencia(parlanteM, ampM, 2.5, 'moderado', DIM_MAYOR_TEST_M);
  const m = modeloPotencia(spkConMinimo, ampDebil, r, 2.5, 'Moderado', 90, 'rockpop', 'es');
  assert.ok(m.avisoHtml, 'debería haber aviso: 30 W < 40 W recomendados');
  assert.match(m.avisoHtml!, /40/);

  const ampSuficiente = ampCat('rega-brio'); // 50 W ≥ 40 W recomendados
  const rSinAviso = evaluarPotencia(parlanteM, amplificadorDelCatalogo(ampSuficiente, 'es'), 2.5, 'moderado', DIM_MAYOR_TEST_M);
  const mSinAviso = modeloPotencia(spkConMinimo, ampSuficiente, rSinAviso, 2.5, 'Moderado', 90, 'rockpop', 'es');
  assert.equal(mSinAviso.avisoHtml, null);
});

test('modeloPotencia: crestFactorHtml refleja el crest factor del género y el nivel promedio implicado (pico − crest factor)', () => {
  const spk = parlanteCat('klipsch-rp600m-ii');
  const amp = ampCat('cambridge-cxa81');
  const r = evaluarPotencia(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'), 2.5, 'alto', DIM_MAYOR_TEST_M);

  const mRock = modeloPotencia(spk, amp, r, 2.5, 'Alto', 100, 'rockpop', 'es');
  assert.match(mRock.crestFactorHtml, /10/); // crest factor rockpop = 10 dB
  assert.match(mRock.crestFactorHtml, /90/); // 100 − 10

  const mClasica = modeloPotencia(spk, amp, r, 2.5, 'Alto', 100, 'clasica', 'es');
  assert.match(mClasica.crestFactorHtml, /18/); // crest factor clásica = 18 dB
  assert.match(mClasica.crestFactorHtml, /82/); // 100 − 18
  assert.notEqual(mRock.crestFactorHtml, mClasica.crestFactorHtml);
});

// ---- % de capacidad del amplificador usada (simpleHtml de potencia) ----

/** % de capacidad = 100/ratio, con ratio = 10^(margenDb/10) — misma fórmula
 * que resultado.ts, para no hardcodear el número esperado en cada vector. */
function porcentajeEsperado(margenDb: number): string {
  return String(Math.round(100 * Math.pow(10, -margenDb / 10)));
}

test('modeloPotencia: simpleHtml de "con-margen" declara el % de capacidad usada, coherente con margenDb', () => {
  const spk = parlanteCat('klipsch-rp600m-ii');
  const amp = ampCat('cambridge-cxa81');
  // 1,0 m — mismo motivo que el test de "severidad ok" de arriba.
  const r = evaluarPotencia(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'), 1.0, 'alto', DIM_MAYOR_TEST_M);
  const m = modeloPotencia(spk, amp, r, 1.0, 'Alto', 100, 'rockpop', 'es');
  assert.equal(r.codigo, 'con-margen');
  assert.match(m.simpleHtml, new RegExp(`${porcentajeEsperado(r.margenDb)}%`));
  assert.match(m.simpleHtml, /margen de sobra/);
});

test('modeloPotencia: simpleHtml de "justo" declara un % de capacidad cercano al límite (70-99%)', () => {
  const spk = parlanteCat('kef-ls50-meta');
  const amp = ampCat('rega-brio');
  // 1,5 m (no 3,0 m): a 3,0 m este par da "insuficiente" tras la corrección
  // del módulo de potencia — se acorta la distancia para seguir
  // ejercitando el caso "justo" que este test nombra.
  const r = evaluarPotencia(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'), 1.5, 'alto', DIM_MAYOR_TEST_M);
  const m = modeloPotencia(spk, amp, r, 1.5, 'Alto', 100, 'rockpop', 'es');
  assert.equal(r.codigo, 'justo');
  assert.match(m.simpleHtml, new RegExp(`${porcentajeEsperado(r.margenDb)}%`));
  assert.match(m.simpleHtml, /al límite/);
});

test('modeloPotencia: simpleHtml de "insuficiente" declara un % de capacidad por encima de 100 — más de lo que el ampli tiene', () => {
  const spk = parlanteCat('kef-ls50-meta');
  const amp = ampCat('rega-brio');
  const r = evaluarPotencia(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'), 3.0, 'referencia', DIM_MAYOR_TEST_M);
  const m = modeloPotencia(spk, amp, r, 3.0, 'Referencia', 105, 'rockpop', 'es');
  assert.equal(r.codigo, 'insuficiente');
  const pct = Number(porcentajeEsperado(r.margenDb));
  assert.ok(pct > 100, `esperaba >100%, dio ${pct}%`);
  assert.match(m.simpleHtml, new RegExp(`${pct}%`));
  assert.match(m.simpleHtml, /más de lo que tiene disponible/);
});

test('modeloPotencia en inglés: simpleHtml con el mismo % de capacidad, texto en inglés', () => {
  const spk = parlanteCat('klipsch-rp600m-ii');
  const amp = ampCat('cambridge-cxa81');
  // 1,0 m — mismo motivo que los tests de "con-margen"/"severidad ok" de arriba.
  const r = evaluarPotencia(parlanteDelCatalogo(spk, 'en'), amplificadorDelCatalogo(amp, 'en'), 1.0, 'alto', DIM_MAYOR_TEST_M);
  const m = modeloPotencia(spk, amp, r, 1.0, 'Loud', 100, 'rockpop', 'en');
  assert.match(m.simpleHtml, new RegExp(`${porcentajeEsperado(r.margenDb)}%`));
  assert.match(m.simpleHtml, /More power than needed/);
  assert.doesNotMatch(m.simpleHtml, /Potencia/);
});

test('modeloPotencia: margenCruzaUmbral (insuficiente→con-margen) reemplaza el simpleHtml normal por el texto que declara los dos códigos, y calcHtml usa la variante con los dos códigos nombrados', () => {
  // Mismos parámetros sintéticos que el test de margenCruzaUmbral en
  // potencia.test.ts (Z=1Ω a propósito, fuera de rango real, para separar
  // los dos extremos lo bastante como para cruzar los dos umbrales).
  const spkExtremo: ParlanteCat = {
    id: 'synthetic-1ohm-sin-convencion',
    marca: 'Test',
    nombre: 'Test 1Ω',
    tipo: { es: 'sintético', en: 'synthetic' },
    descripcion: { es: '', en: '' },
    sensibilidadDb: { valor: 92, fuente: { es: 'test', en: 'test' }, confianza: 'alta' },
    sensibilidadConvencion: null,
    impedanciaNominalOhm: 1,
    impedanciaMinOhm: null,
    impedanciaMaxOhm: null,
    anguloFaseGrados: null,
    potenciaRecMinW: null,
    potenciaRecMaxW: null,
    maxSplDb: null,
    chipsExtra: [],
    fuentes: [],
  };
  const ampExtremo: AmplificadorCat = {
    id: 'synthetic-40w',
    marca: 'Test',
    nombre: 'Test 40W',
    tipo: { es: 'sintético', en: 'synthetic' },
    descripcion: { es: '', en: '' },
    potencia8OhmW: { valor: 40, fuente: { es: 'test', en: 'test' }, confianza: 'alta' },
    potencia4OhmW: null,
    cargaMinOhm: null,
    sensEntradaMv: null,
    impedanciaEntradaOhm: null,
    factorAmortiguamiento: null,
    chipsExtra: [],
    fuentes: [],
  };
  const r = evaluarPotencia(parlanteDelCatalogo(spkExtremo, 'es'), amplificadorDelCatalogo(ampExtremo, 'es'), 2.0, 'alto', DIM_MAYOR_TEST_M);
  assert.equal(r.margenCruzaUmbral, true); // confirma que este fixture sigue ejercitando el caso
  const m = modeloPotencia(spkExtremo, ampExtremo, r, 2.0, 'Alto', 100, 'rockpop', 'es');
  // simpleHtml YA NO es el % de capacidad normal — declara los dos códigos.
  assert.match(m.simpleHtml, /insuficiente/);
  assert.match(m.simpleHtml, /con margen/);
  assert.doesNotMatch(m.simpleHtml, /%/); // no el texto normal de "simple", que sí lleva %
  // calcHtml usa la variante que nombra los dos códigos, no la genérica.
  assert.match(m.calcHtml, /"insuficiente"/);
  assert.match(m.calcHtml, /"con margen"/);
  assert.match(m.calcHtml, /cambia el veredicto/);
});

// ---- carga ----

test('modeloCarga: "sin-datos" nunca dice "ok" — es su propia clase "dim", y el texto no afirma que sea carga fácil', () => {
  const spk = parlanteCat('klipsch-rp600m-ii'); // impedanciaMinOhm: null
  const amp = ampCat('cambridge-cxa81');
  const r = evaluarCarga(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'));
  const m = modeloCarga(spk, amp, r, 'es');
  assert.equal(m.sinDatos, true);
  assert.equal(m.verdictoClase, 'dim');
  assert.notEqual(m.verdictoClase, 'ok');
  assert.doesNotMatch(m.textoHtml, /es una carga fácil/);
  assert.match(m.avisoHtml!, /Pendiente/);
});

test('modeloCarga: carga dura resuelta por potencia bruta (80 W ≥ 60 W, ratio 1,5× no llega a 1,7×) → "ok", texto de potencia suficiente', () => {
  const spk = parlanteCat('kef-ls50-meta');
  const amp = ampCat('cambridge-cxa81'); // 80/120: ratio 1,5× < 1,7× → no es "reserva", resuelve por "potente"
  const r = evaluarCarga(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'));
  const m = modeloCarga(spk, amp, r, 'es');
  assert.equal(m.verdictoClase, 'ok');
  assert.match(m.textoHtml, /entrega suficiente potencia/);
});

test('modeloCarga: carga dura resuelta por reserva de corriente (ratio ≥1,7×) → texto de reserva, no de potencia bruta', () => {
  const spk = parlanteCat('kef-ls50-meta');
  const ampConReserva: AmplificadorCat = {
    ...ampCat('rega-brio'),
    id: 'synthetic-reserva',
    nombre: 'Amplificador de prueba (40 W, dobla a 4 Ω)',
    potencia8OhmW: { valor: 40, fuente: { es: 'test', en: 'test' }, confianza: 'alta' },
    potencia4OhmW: { valor: 80, fuente: { es: 'test', en: 'test' }, confianza: 'alta' }, // 80/40 = 2,0×
  };
  const r = evaluarCarga(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(ampConReserva, 'es'));
  const m = modeloCarga(spk, ampConReserva, r, 'es');
  assert.equal(m.verdictoClase, 'ok');
  assert.match(m.textoHtml, /reserva de corriente/);
});

test('modeloCarga: carga dura sin reserva ni potencia → "warn"', () => {
  const spk = parlanteCat('kef-ls50-meta');
  const amp = ampCat('rega-brio');
  const r = evaluarCarga(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'));
  const m = modeloCarga(spk, amp, r, 'es');
  assert.equal(m.verdictoClase, 'warn');
  assert.ok(m.avisoHtml);
});

test('modeloCarga: sin ángulo de fase (regresión) → calcHtml es null, no se muestra caja de cálculo de EPDR', () => {
  const spk = parlanteCat('kef-ls50-meta'); // nominal 8 Ω, anguloFaseGrados null en el catálogo → sin fallback
  const amp = ampCat('cambridge-cxa81');
  const r = evaluarCarga(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'));
  const m = modeloCarga(spk, amp, r, 'es');
  assert.equal(m.calcHtml, null);
});

test('modeloCarga: EPDR crítico → verdictoTexto/simpleHtml propios, calcHtml con la fórmula, aviso reusa el consejo de reserva de corriente', () => {
  const spk: ParlanteCat = { ...parlanteCat('kef-ls50-meta'), impedanciaMinOhm: 3.0, anguloFaseGrados: -75 };
  const amp = ampCat('cambridge-cxa81'); // resuelve por potencia bruta → severidadBase 'ok', EPDR es quien manda
  const r = evaluarCarga(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'));
  const m = modeloCarga(spk, amp, r, 'es');
  assert.equal(m.verdictoClase, 'alert');
  assert.equal(m.verdictoTexto, 'EPDR crítico');
  assert.match(m.simpleHtml, /ángulo de fase/);
  assert.match(m.textoHtml, /EPDR/);
  assert.ok(m.calcHtml !== null);
  assert.match(m.calcHtml!, /EPDR = /);
  assert.match(m.calcHtml!, /-75/); // ángulo de fase citado, no supuesto
  assert.ok(m.avisoHtml);
});

test('modeloCarga: EPDR con ángulo supuesto (fallback -45°, nominal ≤4 Ω) → calcHtml declara que es un supuesto, no un dato citado', () => {
  const spk: ParlanteCat = { ...parlanteCat('kef-ls50-meta'), impedanciaNominalOhm: 4, impedanciaMinOhm: 3.0, anguloFaseGrados: null };
  const amp = ampCat('cambridge-cxa81');
  const r = evaluarCarga(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'));
  const m = modeloCarga(spk, amp, r, 'es');
  assert.match(m.calcHtml!, /-45/);
  assert.match(m.calcHtml!, /se asume/);
});

test('modeloCarga en inglés: EPDR crítico usa los textos propios, sin mezclar idiomas', () => {
  const spk: ParlanteCat = { ...parlanteCat('kef-ls50-meta'), impedanciaMinOhm: 3.0, anguloFaseGrados: -75 };
  const amp = ampCat('cambridge-cxa81');
  const r = evaluarCarga(parlanteDelCatalogo(spk, 'en'), amplificadorDelCatalogo(amp, 'en'));
  const m = modeloCarga(spk, amp, r, 'en');
  assert.equal(m.verdictoTexto, 'EPDR critical');
  assert.match(m.textoHtml, /phase angle/);
  assert.doesNotMatch(m.textoHtml, /ángulo de fase/);
});

// ---- amortiguamiento (interacción DF↔curva de impedancia) ----

test('modeloAmortiguamiento: "sin-datos" (catálogo real, sin factorAmortiguamiento poblado todavía) → tarjeta oculta, no "ok"', () => {
  const spkM = parlanteDelCatalogo(parlanteCat('kef-ls50-meta'), 'es');
  const ampM = amplificadorDelCatalogo(ampCat('rega-brio'), 'es');
  const r = evaluarAmortiguamiento(spkM, ampM);
  const m = modeloAmortiguamiento(r, 'es');
  assert.equal(m.sinDatos, true);
  assert.equal(m.verdictoClase, 'dim');
  assert.notEqual(m.verdictoClase, 'ok');
});

test('modeloAmortiguamiento: "óptimo" (DF alto) → sin aviso, calc muestra Z_out/ΔdB', () => {
  const spkM = { ...parlanteDelCatalogo(parlanteCat('kef-ls50-meta'), 'es'), impedanciaMinOhm: 4, impedanciaMaxOhm: 25 };
  const ampM = { ...amplificadorDelCatalogo(ampCat('cambridge-cxa81'), 'es'), factorAmortiguamiento: 200 };
  const r = evaluarAmortiguamiento(spkM, ampM);
  const m = modeloAmortiguamiento(r, 'es');
  assert.equal(m.verdictoClase, 'ok');
  assert.equal(m.verdictoTexto, 'Óptimo');
  assert.equal(m.avisoHtml, null);
  assert.match(m.calcHtml!, /Z_out/);
});

test('modeloAmortiguamiento: tier de texto "crítico" (ΔdB≈2,85, DF valvular bajo) → título/explicación/acción propios de ese tramo, sin fallback de Zmax', () => {
  const spkM = { ...parlanteDelCatalogo(parlanteCat('kef-ls50-meta'), 'es'), impedanciaMinOhm: 4, impedanciaMaxOhm: null };
  const ampM = { ...amplificadorDelCatalogo(ampCat('cambridge-cxa81'), 'es'), factorAmortiguamiento: 4 };
  const r = evaluarAmortiguamiento(spkM, ampM);
  const m = modeloAmortiguamiento(r, 'es');
  assert.equal(m.verdictoClase, 'alert');
  assert.equal(m.verdictoTexto, 'Crítico');
  assert.match(m.textoHtml, /Desviación de nivel fuera del rango/); // titulo del tier "critico"
  assert.match(m.textoHtml, /mide nivel, no distorsión, excursión ni comportamiento térmico/); // consecuenciaMedible
  assert.match(m.avisoHtml!, /Combinación no recomendada tal como está/); // accionSugerida
  assert.match(m.avisoHtml!, /se asume/); // impedanciaMaxOhm null → nota del fallback de 25 Ω
  // nunca juicios de carácter tonal ni mecanismos que este cálculo no mide
  assert.doesNotMatch(m.textoHtml + m.avisoHtml, /cálid|musical|retumbante|difuso|térmica descontrolada/i);
});

test('modeloAmortiguamiento: tier de texto "moderado" (ΔdB≈0,69) → explicación y acción propias de ese tramo, "con reparos"', () => {
  const spkM = { ...parlanteDelCatalogo(parlanteCat('kef-ls50-meta'), 'es'), impedanciaMinOhm: 4, impedanciaMaxOhm: 25 };
  const ampM = { ...amplificadorDelCatalogo(ampCat('cambridge-cxa81'), 'es'), factorAmortiguamiento: 20 };
  const r = evaluarAmortiguamiento(spkM, ampM);
  const m = modeloAmortiguamiento(r, 'es');
  assert.equal(m.verdictoClase, 'warn');
  assert.match(m.textoHtml, /Realce de nivel moderado en la zona de resonancia/);
  assert.match(m.avisoHtml!, /Un amplificador con mayor factor de amortiguamiento reduce este realce/);
  assert.doesNotMatch(m.textoHtml, /calidez|válvulas|jazz|vocal/i); // sin juicio de carácter ni recomendación por género
});

test('modeloAmortiguamiento: el tier de TEXTO "severo" (1,2–2,5 dB) es independiente de la severidad — puede caer en "warn" o "alert" según el umbral existente (1,5 dB)', () => {
  const spkBase = { ...parlanteDelCatalogo(parlanteCat('kef-ls50-meta'), 'es'), impedanciaMinOhm: 4, impedanciaMaxOhm: 25 };
  const ampBase = amplificadorDelCatalogo(ampCat('cambridge-cxa81'), 'es');

  const casiWarn = modeloAmortiguamiento(evaluarAmortiguamiento(spkBase, { ...ampBase, factorAmortiguamiento: 10 }), 'es'); // ΔdB≈1,31 → warn
  assert.equal(casiWarn.verdictoClase, 'warn');
  assert.match(casiWarn.textoHtml, /Desviación de nivel amplia en la respuesta de frecuencia/); // mismo tier de texto "severo"

  const casiAlert = modeloAmortiguamiento(evaluarAmortiguamiento(spkBase, { ...ampBase, factorAmortiguamiento: 8 }), 'es'); // ΔdB≈1,60 → alert
  assert.equal(casiAlert.verdictoClase, 'alert');
  assert.match(casiAlert.textoHtml, /Desviación de nivel amplia en la respuesta de frecuencia/); // mismo tier de texto "severo" que el caso "warn" de arriba

  assert.match(casiWarn.avisoHtml!, /Conviene un amplificador con mayor factor de amortiguamiento/);
  assert.match(casiAlert.avisoHtml!, /Conviene un amplificador con mayor factor de amortiguamiento/);
});

test('modeloAmortiguamiento: tier "óptimo" no interpola cifras que no aplican y no lleva aviso', () => {
  const spkM = { ...parlanteDelCatalogo(parlanteCat('kef-ls50-meta'), 'es'), impedanciaMinOhm: 4, impedanciaMaxOhm: 25 };
  const ampM = { ...amplificadorDelCatalogo(ampCat('cambridge-cxa81'), 'es'), factorAmortiguamiento: 1000 };
  const r = evaluarAmortiguamiento(spkM, ampM);
  const m = modeloAmortiguamiento(r, 'es');
  assert.equal(m.avisoHtml, null);
  assert.match(m.textoHtml, /Sin alteración medible de la respuesta/);
});

test('modeloAmortiguamiento en inglés: tier de texto propio, sin mezclar idiomas', () => {
  const spkM = { ...parlanteDelCatalogo(parlanteCat('kef-ls50-meta'), 'en'), impedanciaMinOhm: 4, impedanciaMaxOhm: 25 };
  const ampM = { ...amplificadorDelCatalogo(ampCat('cambridge-cxa81'), 'en'), factorAmortiguamiento: 4 };
  const r = evaluarAmortiguamiento(spkM, ampM);
  const m = modeloAmortiguamiento(r, 'en');
  assert.equal(m.verdictoTexto, 'Critical');
  assert.match(m.textoHtml, /Level deviation outside the range this model considers manageable/);
  assert.match(m.avisoHtml!, /Not a recommended pairing as-is/);
  assert.doesNotMatch(m.textoHtml + m.avisoHtml, /amortiguación|desviación/);
});

// ---- ganancia (puente + recorrido) ----

test('modeloPuente: "sin-datos" es clase "dim", no "ok", y no calcula un ratioZ inexistente', () => {
  const fuente = fuenteCat('cambridge-cxn-v2'); // impedanciaSalidaOhm: null
  const amp = ampCat('cambridge-cxa81');
  const r = evaluarPuenteImpedancias(fuenteDelCatalogo(fuente, 'es'), amplificadorDelCatalogo(amp, 'es'));
  const m = modeloPuente(fuente, amp, r, 'es');
  assert.equal(m.sinDatos, true);
  assert.equal(m.verdictoClase, 'dim');
  assert.equal(m.calcHtml, '');
});

test('modeloPuente: "ok" incluye el ratioZ calculado en el texto', () => {
  const fuente = fuenteCat('topping-e30-ii');
  const amp = ampCat('cambridge-cxa81');
  const r = evaluarPuenteImpedancias(fuenteDelCatalogo(fuente, 'es'), amplificadorDelCatalogo(amp, 'es'));
  const m = modeloPuente(fuente, amp, r, 'es');
  assert.equal(m.verdictoClase, 'ok');
  assert.match(m.calcHtml, /ratioZ/);
  assert.match(m.textoHtml, /2150|2\.150|2150,0/); // 43000/20
});

test('modeloRecorrido: "sin-datos" es clase "dim"; "warn" cuando el margen supera el umbral', () => {
  const fuenteSinDatos = fuenteCat('cambridge-cxn-v2');
  const amp = ampCat('cambridge-cxa81');
  const rSinDatos = evaluarRecorridoVolumen(fuenteDelCatalogo(fuenteSinDatos, 'es'), amplificadorDelCatalogo(amp, 'es'));
  assert.equal(modeloRecorrido(fuenteSinDatos, amp, rSinDatos, 'es').verdictoClase, 'dim');

  const fuenteSchiit = fuenteCat('schiit-modi-plus');
  const denon = ampCat('denon-pma600ne');
  const rCorto = evaluarRecorridoVolumen(fuenteDelCatalogo(fuenteSchiit, 'es'), amplificadorDelCatalogo(denon, 'es'));
  const mCorto = modeloRecorrido(fuenteSchiit, denon, rCorto, 'es');
  assert.equal(mCorto.verdictoClase, 'warn');
  assert.match(mCorto.textoHtml, /de sobra/);
});

// ---- modos de sala ----

const SALA_MODOS = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
const NULO_LEJOS = evaluarNuloEscucha(SALA_MODOS, 0.1); // y muy cerca del muro frontal, lejos del centro (2,5 m)
const NULO_CERCA = evaluarNuloEscucha(SALA_MODOS, 2.5); // exactamente en el centro → nulo

test('modeloModos: sala 3,6×5,0×2,4 (razón 3:2 ancho/alto) → "warn", con el par de agrupamiento en el aviso', () => {
  const r = evaluarModos(SALA_MODOS);
  const m = modeloModos(r, NULO_LEJOS, 'es');
  assert.equal(m.verdictoClase, 'warn');
  assert.equal(m.verdictoTexto, 'Modos agrupados');
  assert.ok(m.avisoHtml !== null);
  assert.match(m.avisoHtml!, /ancho/);
  assert.match(m.avisoHtml!, /alto/);
  assert.match(m.simpleHtml, /reforzad/);
  assert.ok(m.sugerenciaHtml !== null);
  assert.match(m.sugerenciaHtml!, /reposicionar/);
  assert.notEqual(m.sugerenciaHtml, m.avisoHtml); // consejo accionable, no la lista de pares
});

test('modeloModos: sala 2,5×3,0×2,2 sin agrupamiento y escucha lejos del centro → "ok", sin aviso ni sugerencia', () => {
  const sala = { anchoM: 2.5, largoM: 3.0, altoM: 2.2 };
  const r = evaluarModos(sala);
  const m = modeloModos(r, evaluarNuloEscucha(sala, 0.1), 'es');
  assert.equal(m.verdictoClase, 'ok');
  assert.equal(m.verdictoTexto, 'Bien distribuidos');
  assert.equal(m.avisoHtml, null);
  assert.equal(m.sugerenciaHtml, null);
});

test('modeloModos: escucha en el nulo (sin agrupamiento) → "warn", verdicto y textos propios del nulo, no los de agrupamiento', () => {
  const sala = { anchoM: 2.5, largoM: 3.0, altoM: 2.2 }; // sin agrupamiento (ver test de arriba)
  const r = evaluarModos(sala);
  const m = modeloModos(r, evaluarNuloEscucha(sala, sala.largoM / 2), 'es');
  assert.equal(m.verdictoClase, 'warn');
  assert.equal(m.verdictoTexto, 'Nulo en el punto de escucha');
  assert.match(m.simpleHtml, /hueco de graves/);
  assert.ok(m.avisoHtml !== null);
  assert.match(m.avisoHtml!, /nulo modal/);
  assert.ok(m.sugerenciaHtml !== null);
  assert.match(m.sugerenciaHtml!, /mover el punto de escucha/);
});

test('modeloModos: agrupamiento Y nulo a la vez → "warn", verdicto combinado, aviso con las dos partes', () => {
  const r = evaluarModos(SALA_MODOS);
  const m = modeloModos(r, NULO_CERCA, 'es');
  assert.equal(m.verdictoClase, 'warn');
  assert.equal(m.verdictoTexto, 'Modos agrupados y nulo en la escucha');
  assert.match(m.avisoHtml!, /ancho/); // sigue trayendo los pares agrupados
  assert.match(m.avisoHtml!, /nulo modal/); // y la explicación del nulo
  assert.match(m.sugerenciaHtml!, /reposicionar/);
  assert.match(m.sugerenciaHtml!, /mover el punto de escucha/);
});

test('modeloModos nunca es "alert" ni "dim" — el techo de severidad de sala es "warn" (CLAUDE.md)', () => {
  const salas = [
    { anchoM: 2.5, largoM: 3.0, altoM: 2.2 },
    { anchoM: 3.6, largoM: 5.0, altoM: 2.4 },
    { anchoM: 4, largoM: 4, altoM: 2.5 },
  ];
  for (const sala of salas) {
    for (const y of [0.1, sala.largoM / 2]) {
      const clase = modeloModos(evaluarModos(sala), evaluarNuloEscucha(sala, y), 'es').verdictoClase;
      assert.ok(clase === 'ok' || clase === 'warn', `clase inesperada: ${clase}`);
    }
  }
});

test('modeloModos en inglés: veredicto y texto en inglés, sin mezclar idiomas', () => {
  const r = evaluarModos(SALA_MODOS);
  const m = modeloModos(r, NULO_LEJOS, 'en');
  assert.equal(m.verdictoTexto, 'Clustered modes');
  assert.match(m.textoHtml, /mode pair/);
  assert.doesNotMatch(m.textoHtml, /par\(es\)/);
});

test('modeloModos en inglés: nulo de escucha usa los textos propios, sin mezclar idiomas', () => {
  const sala = { anchoM: 2.5, largoM: 3.0, altoM: 2.2 };
  const r = evaluarModos(sala);
  const m = modeloModos(r, evaluarNuloEscucha(sala, sala.largoM / 2), 'en');
  assert.equal(m.verdictoTexto, 'Null at the listening spot');
  assert.match(m.avisoHtml!, /modal null/);
  assert.doesNotMatch(m.avisoHtml!, /nulo modal/);
});

// ---- reverberación (RT60, materiales por superficie) ----

const SALA_REVERB = { anchoM: 3.6, largoM: 5.0, altoM: 2.4 };
const MATERIALES_TIPICOS: Materiales = {
  muroFrontal: 'yesoCarton',
  muroPosterior: 'yesoCarton',
  muroIzquierdo: 'yesoCarton',
  muroDerecho: 'yesoCarton',
  piso: 'maderaLaminado',
  techo: 'yesoCarton',
};
const MATERIALES_MUY_TRATADOS: Materiales = {
  muroFrontal: 'panelAcustico',
  muroPosterior: 'panelAcustico',
  muroIzquierdo: 'panelAcustico',
  muroDerecho: 'panelAcustico',
  piso: 'alfombra',
  techo: 'panelAcustico',
};
const MATERIALES_INTERMEDIOS: Materiales = {
  muroFrontal: 'panelAcustico',
  muroPosterior: 'madera',
  muroIzquierdo: 'madera',
  muroDerecho: 'madera',
  piso: 'alfombra',
  techo: 'yesoCarton',
};

test('modeloReverberacion: muros/techo yeso cartón + piso madera laminado → "warn" ("Muy viva"), calc muestra el desglose por superficie', () => {
  const r = evaluarReverberacion(SALA_REVERB, MATERIALES_TIPICOS);
  const m = modeloReverberacion(r, MATERIALES_TIPICOS, 'es');
  assert.equal(r.codigo, 'rt60-largo');
  assert.equal(m.verdictoClase, 'warn');
  assert.equal(m.verdictoTexto, 'Muy viva');
  assert.match(m.simpleHtml, /refleja mucho/);
  assert.match(m.textoHtml, new RegExp('≈' + num(r.rt60S, 1, 'es')));
  assert.match(m.calcHtml, /Placa yeso cartón/);
  assert.match(m.calcHtml, /Madera laminado/);
  assert.match(m.calcHtml, new RegExp(num(r.absorcionTotalSabines, 2, 'es')));
});

test('modeloReverberacion: muro frontal "vacío" (abertura) aparece en el calc con su propia fila y baja la absorción total', () => {
  const conAbertura: Materiales = { ...MATERIALES_TIPICOS, muroFrontal: 'vacio' };
  const r = evaluarReverberacion(SALA_REVERB, conAbertura);
  const m = modeloReverberacion(r, conAbertura, 'es');
  assert.match(m.calcHtml, /Vacío \(abertura\)/);
  assert.ok(r.absorcionTotalSabines > evaluarReverberacion(SALA_REVERB, MATERIALES_TIPICOS).absorcionTotalSabines);
});

test('modeloReverberacion: paneles acústicos en muro/techo + alfombra en piso → "warn" ("Muy seca", demasiado absorbente)', () => {
  const r = evaluarReverberacion(SALA_REVERB, MATERIALES_MUY_TRATADOS);
  const m = modeloReverberacion(r, MATERIALES_MUY_TRATADOS, 'es');
  assert.equal(r.codigo, 'rt60-corto');
  assert.equal(m.verdictoClase, 'warn');
  assert.equal(m.verdictoTexto, 'Muy seca');
  assert.match(m.simpleHtml, /absorbe mucho/);
  assert.match(m.calcHtml, /Panel acústico/);
  assert.match(m.calcHtml, /Alfombra/);
});

test('modeloReverberacion: combinación intermedia (madera + alfombra + panel acústico) → "ok"', () => {
  const r = evaluarReverberacion(SALA_REVERB, MATERIALES_INTERMEDIOS);
  const m = modeloReverberacion(r, MATERIALES_INTERMEDIOS, 'es');
  assert.equal(r.codigo, 'rt60-ok');
  assert.equal(m.verdictoClase, 'ok');
  assert.equal(m.verdictoTexto, 'En rango');
});

test('modeloReverberacion nunca es "alert" ni "dim" — el techo de severidad de sala es "warn" (CLAUDE.md)', () => {
  const salas = [
    { anchoM: 2.5, largoM: 3.0, altoM: 2.2 },
    { anchoM: 3.6, largoM: 5.0, altoM: 2.4 },
    { anchoM: 7, largoM: 9, altoM: 3.5 },
  ];
  const combos: Materiales[] = [MATERIALES_TIPICOS, MATERIALES_MUY_TRATADOS, MATERIALES_INTERMEDIOS];
  for (const sala of salas) {
    for (const materiales of combos) {
      const clase = modeloReverberacion(evaluarReverberacion(sala, materiales), materiales, 'es').verdictoClase;
      assert.ok(clase === 'ok' || clase === 'warn', `clase inesperada: ${clase}`);
    }
  }
});

test('modeloReverberacion en inglés: veredicto, texto y calc en inglés, sin mezclar idiomas', () => {
  const r = evaluarReverberacion(SALA_REVERB, MATERIALES_TIPICOS);
  const m = modeloReverberacion(r, MATERIALES_TIPICOS, 'en');
  assert.notEqual(m.verdictoTexto, 'Muy viva');
  assert.equal(m.verdictoTexto, 'Too live');
  assert.match(m.fuenteHtml, /Sabine/);
  assert.match(m.calcHtml, /Drywall/);
  assert.match(m.calcHtml, /Laminate wood/);
  assert.doesNotMatch(m.textoHtml, /sala doméstica/);
  assert.doesNotMatch(m.calcHtml, /Placa yeso cartón/);
});

// ---- ubicación de referencia de los parlantes ----

test('modeloUbicacionParlantes: caso simétrico (disposición automática) — ambos parlantes dan el mismo par de valores (vector motor-mvp.md sección 4)', () => {
  const disp = calcularDisposicion(SALA_REVERB); // W=3,6 L=5,0 H=2,4 → offsetFrenteM=0,75 parlanteIzq.x=0,81 parlanteDer.x=2,79 separacionM=1,98
  const html = modeloUbicacionParlantes(SALA_REVERB, disp, 'es');
  assert.match(html, /0,75 m/); // ambos parlantes: distancia a la pared frontal
  assert.match(html, /0,81 m/); // izquierdo: distancia a su pared lateral (x=0)
  assert.match(html, /0,81 m/); // derecho: distancia a SU pared lateral (anchoM−2,79=0,81) — mismo valor, simetría
  assert.match(html, /1,98 m/); // separación entre parlantes
});

test('modeloUbicacionParlantes en inglés: mismos números, punto decimal', () => {
  const disp = calcularDisposicion(SALA_REVERB);
  const html = modeloUbicacionParlantes(SALA_REVERB, disp, 'en');
  assert.match(html, /0\.75 m/);
  assert.match(html, /0\.81 m/);
  assert.match(html, /1\.98 m/);
});

test('modeloUbicacionParlantes: caso asimétrico (parlantes arrastrados a mano) — cada parlante reporta SU propia distancia, no un valor compartido', () => {
  const sala: Sala = { anchoM: 4.0, largoM: 6.0, altoM: 2.4 };
  const disp = calcularDisposicionManual(sala, { x: 0.9, y: 0.6 }, { x: 3.2, y: 1.0 });
  const html = modeloUbicacionParlantes(sala, disp, 'es');
  assert.match(html, /0,60 m/); // izquierdo: distancia a la pared frontal (parlanteIzq.y)
  assert.match(html, /0,90 m/); // izquierdo: distancia a su pared lateral (parlanteIzq.x)
  assert.match(html, /1,00 m/); // derecho: distancia a la pared frontal (parlanteDer.y)
  assert.match(html, /0,80 m/); // derecho: distancia a SU pared lateral (anchoM−parlanteDer.x = 4,0−3,2)
  assert.match(html, /2,33 m/); // separación entre ambos (distancia real, no la separación en X)
});

// ---- resumen final ----
// El parámetro "veredicto" de modeloResumenFinal sólo necesita tituloHtml +
// clase — mismo shape mínimo que ModeloVeredicto ya expone, ver resultado.ts.

const VEREDICTO_OK = { tituloHtml: 'Configuración totalmente compatible', clase: 'ok' as const };
const VEREDICTO_WARN = { tituloHtml: 'Configuración soportada, con límites', clase: 'warn' as const };
const VEREDICTO_ALERT = { tituloHtml: 'Configuración no recomendada', clase: 'alert' as const };
const VEREDICTO_OK_EN = { tituloHtml: 'Fully compatible match', clase: 'ok' as const };

test('modeloResumenFinal: componentes "ok" van a fortalezas, "warn"/"alert" a debilidades; "dim" no cuenta en ninguna', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Potencia', verdictoClase: 'ok', verdictoTexto: 'Con margen', avisoHtml: null },
    { nombre: 'Carga', verdictoClase: 'warn', verdictoTexto: 'Exige corriente', avisoHtml: '<b>Aviso de carga</b>' },
    { nombre: 'Puente de impedancias', verdictoClase: 'alert', verdictoTexto: 'Puente insuficiente', avisoHtml: '<b>Aviso de puente</b>' },
    { nombre: 'Modos de sala', verdictoClase: 'dim', verdictoTexto: 'Sin dato', avisoHtml: null },
  ];
  const m = modeloResumenFinal(componentes, VEREDICTO_WARN, 'es');
  assert.match(m.fortalezasHtml, /Potencia: Con margen/);
  assert.doesNotMatch(m.fortalezasHtml, /Carga|Puente|Modos/);
  assert.match(m.debilidadesHtml, /Carga: Exige corriente/);
  assert.match(m.debilidadesHtml, /Puente de impedancias: Puente insuficiente/);
  assert.doesNotMatch(m.debilidadesHtml, /Modos de sala/);
  assert.match(m.resumenHtml, /De 3 componentes evaluados: 1 sin observaciones y 2 con algo para revisar/);
});

test('modeloResumenFinal: "dim" (sin-datos) no cuenta ni como fortaleza ni como debilidad, pero sí se descuenta del total evaluado', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Potencia', verdictoClase: 'ok', verdictoTexto: 'Con margen', avisoHtml: null },
    { nombre: 'Puente de impedancias', verdictoClase: 'dim', verdictoTexto: 'Sin dato', avisoHtml: null },
  ];
  const m = modeloResumenFinal(componentes, VEREDICTO_OK, 'es');
  assert.match(m.resumenHtml, /De 1 componentes evaluados: 1 sin observaciones y 0 con algo para revisar/);
  assert.doesNotMatch(m.fortalezasHtml, /Puente/);
  assert.doesNotMatch(m.debilidadesHtml, /Puente/);
});

test('modeloResumenFinal: "dim" aparece en sinDatosHtml — ya no se publica como tarjeta propia, esta es su única mención visible', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Potencia', verdictoClase: 'ok', verdictoTexto: 'Con margen', avisoHtml: null },
    { nombre: 'Puente de impedancias (Streamer)', verdictoClase: 'dim', verdictoTexto: 'Sin dato', avisoHtml: null },
  ];
  const m = modeloResumenFinal(componentes, VEREDICTO_OK, 'es');
  assert.match(m.sinDatosHtml, /Puente de impedancias \(Streamer\): no se evaluó/);
});

test('modeloResumenFinal: sin ningún componente "dim", sinDatosHtml queda vacío — no se menciona cuando todo tenía dato', () => {
  const componentes: ComponenteResumen[] = [{ nombre: 'Potencia', verdictoClase: 'ok', verdictoTexto: 'Con margen', avisoHtml: null }];
  const m = modeloResumenFinal(componentes, VEREDICTO_OK, 'es');
  assert.equal(m.sinDatosHtml, '');
});

test('modeloResumenFinal: con "detalle" numérico, se agrega entre paréntesis junto al veredicto', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Potencia', verdictoClase: 'ok', verdictoTexto: 'Con margen', detalle: '+4,8 dB', avisoHtml: null },
  ];
  const m = modeloResumenFinal(componentes, VEREDICTO_OK, 'es');
  assert.match(m.fortalezasHtml, /Potencia: Con margen \(\+4,8 dB\)/);
});

test('modeloResumenFinal: las recomendaciones incluyen TODAS las debilidades con aviso, no sólo la peor', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Carga', verdictoClase: 'warn', verdictoTexto: 'Exige corriente', avisoHtml: '<b>Aviso de carga</b>' },
    { nombre: 'Puente de impedancias', verdictoClase: 'alert', verdictoTexto: 'Puente insuficiente', avisoHtml: '<b>Aviso de puente</b>' },
  ];
  const m = modeloResumenFinal(componentes, VEREDICTO_ALERT, 'es');
  assert.match(m.recomendacionesHtml, /Aviso de puente/);
  assert.match(m.recomendacionesHtml, /Aviso de carga/);
  assert.equal((m.recomendacionesHtml.match(/<li>/g) ?? []).length, 2);
});

test('modeloResumenFinal: debilidad sin avisoHtml no genera una recomendación vacía', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Carga', verdictoClase: 'warn', verdictoTexto: 'Exige corriente', avisoHtml: null },
  ];
  const m = modeloResumenFinal(componentes, VEREDICTO_WARN, 'es');
  assert.equal((m.recomendacionesHtml.match(/<li>/g) ?? []).length, 1);
  assert.match(m.recomendacionesHtml, /No hay ningún punto pendiente/);
});

test('modeloResumenFinal: todo "ok" → recomendación de cierre positivo, sin fortalezas ni debilidades vacías', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Potencia', verdictoClase: 'ok', verdictoTexto: 'Con margen', avisoHtml: null },
    { nombre: 'Carga', verdictoClase: 'ok', verdictoTexto: 'Cubierto', avisoHtml: null },
  ];
  const m = modeloResumenFinal(componentes, VEREDICTO_OK, 'es');
  assert.match(m.debilidadesHtml, /Ningún componente evaluado quedó con algo para revisar/);
  assert.match(m.recomendacionesHtml, /No hay ningún punto pendiente/);
});

test('modeloResumenFinal en inglés: textos en inglés, sin mezclar idiomas', () => {
  const componentes: ComponenteResumen[] = [{ nombre: 'Power', verdictoClase: 'ok', verdictoTexto: 'With margin', avisoHtml: null }];
  const m = modeloResumenFinal(componentes, VEREDICTO_OK_EN, 'en');
  assert.match(m.fortalezasHtml, /Power: With margin/);
  assert.match(m.debilidadesHtml, /No evaluated component came out with something worth checking/);
  assert.match(m.recomendacionesHtml, /Nothing pending/);
});

// ---- modeloResumenFinal: comportamientoHtml (párrafo holístico) ----

test('modeloResumenFinal: comportamientoHtml varía según la clase del veredicto (ok/warn/alert), siempre incluye su título', () => {
  const componentes: ComponenteResumen[] = [{ nombre: 'Potencia', verdictoClase: 'ok', verdictoTexto: 'Con margen', avisoHtml: null }];
  const mOk = modeloResumenFinal(componentes, VEREDICTO_OK, 'es');
  const mWarn = modeloResumenFinal(componentes, VEREDICTO_WARN, 'es');
  const mAlert = modeloResumenFinal(componentes, VEREDICTO_ALERT, 'es');
  assert.match(mOk.comportamientoHtml, /funciona bien/);
  assert.match(mOk.comportamientoHtml, /Configuración totalmente compatible/);
  assert.match(mWarn.comportamientoHtml, /conviene revisar/);
  assert.match(mWarn.comportamientoHtml, /Configuración soportada, con límites/);
  assert.match(mAlert.comportamientoHtml, /varios puntos que conviene resolver/);
  assert.match(mAlert.comportamientoHtml, /Configuración no recomendada/);
  assert.notEqual(mOk.comportamientoHtml, mWarn.comportamientoHtml);
  assert.notEqual(mWarn.comportamientoHtml, mAlert.comportamientoHtml);
});

test('modeloResumenFinal en inglés: comportamientoHtml en inglés, sin mezclar idiomas', () => {
  const componentes: ComponenteResumen[] = [{ nombre: 'Power', verdictoClase: 'ok', verdictoTexto: 'With margin', avisoHtml: null }];
  const m = modeloResumenFinal(componentes, VEREDICTO_OK_EN, 'en');
  assert.match(m.comportamientoHtml, /works well/);
  assert.match(m.comportamientoHtml, /Fully compatible match/);
  assert.doesNotMatch(m.comportamientoHtml, /funciona bien|Configuración/);
});

// ---- idioma 'en': mismos números, texto en inglés ----

test('modeloPotencia en inglés: mismo margenDb numérico, texto y veredicto en inglés, número con punto decimal', () => {
  const spk = parlanteCat('klipsch-rp600m-ii');
  const amp = ampCat('cambridge-cxa81');
  // 1,0 m — mismo motivo que los tests de "con-margen"/"severidad ok" de arriba
  // ("With margin"/"Plenty of headroom" abajo exigen codigo 'con-margen').
  const r = evaluarPotencia(parlanteDelCatalogo(spk, 'en'), amplificadorDelCatalogo(amp, 'en'), 1.0, 'alto', DIM_MAYOR_TEST_M);
  const mEs = modeloPotencia(spk, amp, r, 1.0, 'Alto', 100, 'rockpop', 'es');
  const mEn = modeloPotencia(spk, amp, r, 1.0, 'Alto', 100, 'rockpop', 'en');
  assert.equal(mEn.margenDb, mEs.margenDb); // el número que calculó el motor no cambia con el idioma
  assert.equal(mEn.verdictoTexto, 'With margin');
  assert.match(mEn.textoHtml, /Plenty of headroom/);
  assert.match(mEn.textoHtml, /\d\.\d/); // punto decimal, no coma
  assert.doesNotMatch(mEn.textoHtml, /\d,\d/);
});

test('modeloCarga en inglés: "sin-datos" es "No data", no "ok"; fuente muestra "low confidence" no "confianza baja"', () => {
  const spk = parlanteCat('klipsch-rp600m-ii');
  const amp = ampCat('cambridge-cxa81');
  const r = evaluarCarga(parlanteDelCatalogo(spk, 'en'), amplificadorDelCatalogo(amp, 'en'));
  const m = modeloCarga(spk, amp, r, 'en');
  assert.equal(m.verdictoTexto, 'No data');
  assert.match(m.fuenteHtml, /low confidence/);
  assert.doesNotMatch(m.fuenteHtml, /confianza/);
});

test('modeloPuente en inglés: cita la convención con "confidence" en inglés, no mezcla idiomas', () => {
  const fuente = fuenteCat('topping-e30-ii');
  const amp = ampCat('cambridge-cxa81');
  const r = evaluarPuenteImpedancias(fuenteDelCatalogo(fuente, 'en'), amplificadorDelCatalogo(amp, 'en'));
  const m = modeloPuente(fuente, amp, r, 'en');
  assert.equal(m.verdictoTexto, 'Bridge correct');
  assert.match(m.fuenteHtml, /confidence/);
  assert.doesNotMatch(m.fuenteHtml, /convención|confianza/);
});

// ---- modeloDocumento (vista previa "Documento", ver CLAUDE.md) ----

const DOC_SPK = parlanteCat('kef-ls50-meta');
const DOC_AMP = ampCat('rega-brio');
const DOC_STREAMER = fuenteCat('topping-e30-ii');
const DOC_DAC = fuenteCat('schiit-modi-plus');
const DOC_MUROS = { frontal: 'yesoCarton', posterior: 'yesoCarton', izquierdo: 'yesoCarton', derecho: 'yesoCarton' } as const;

/** Arma un `DatosSeccionesDocumento` real (motor + modelos ya calculados,
 * mismo camino que `construirSnapshot()` en main.ts) para no testear
 * `modeloDocumento` contra objetos inventados a mano — streamer/dac
 * opcionales, igual que en la app real. */
function datosDocumentoFixture(idioma: 'es' | 'en', streamer: FuenteCat | null = null, dac: FuenteCat | null = null) {
  const sala = SALA_REVERB;
  const disposicion = calcularDisposicion(sala);
  const spkM = parlanteDelCatalogo(DOC_SPK, idioma);
  const ampM = amplificadorDelCatalogo(DOC_AMP, idioma);

  const resPot = evaluarPotencia(spkM, ampM, disposicion.distanciaEscuchaM, 'alto', DIM_MAYOR_TEST_M);
  const mPot = modeloPotencia(DOC_SPK, DOC_AMP, resPot, disposicion.distanciaEscuchaM, idioma === 'es' ? 'Alto' : 'High', 100, 'rockpop', idioma);
  const mCarga = modeloCarga(DOC_SPK, DOC_AMP, evaluarCarga(spkM, ampM), idioma);
  const mAmortiguamiento = modeloAmortiguamiento(evaluarAmortiguamiento(spkM, ampM), idioma);

  const fuenteModelos = (f: FuenteCat | null) => {
    if (!f) return { puente: null, recorrido: null };
    const fM = fuenteDelCatalogo(f, idioma);
    return {
      puente: modeloPuente(f, DOC_AMP, evaluarPuenteImpedancias(fM, ampM), idioma),
      recorrido: modeloRecorrido(f, DOC_AMP, evaluarRecorridoVolumen(fM, ampM), idioma),
    };
  };
  const st = fuenteModelos(streamer);
  const dc = fuenteModelos(dac);

  const resModos = evaluarModos(sala);
  const resNuloEscucha = evaluarNuloEscucha(sala, disposicion.puntoDulce.y);
  const mModos = modeloModos(resModos, resNuloEscucha, idioma);
  const mReverb = modeloReverberacion(evaluarReverberacion(sala, MATERIALES_TIPICOS), MATERIALES_TIPICOS, idioma);

  const veredicto = { tituloHtml: idioma === 'es' ? 'Configuración totalmente compatible' : 'Fully compatible match', clase: 'ok' as const };
  const componentes: ComponenteResumen[] = [
    { nombre: 'Potencia', verdictoClase: mPot.verdictoClase, verdictoTexto: mPot.verdictoTexto, avisoHtml: mPot.avisoHtml },
  ];
  const resumenFinal = modeloResumenFinal(componentes, veredicto, idioma);

  return {
    veredicto,
    datos: {
      mPot,
      mCarga,
      mAmortiguamiento,
      mPuenteStreamer: st.puente,
      mRecorridoStreamer: st.recorrido,
      mPuenteDac: dc.puente,
      mRecorridoDac: dc.recorrido,
      mModos,
      agrupadosModos: resModos.agrupados,
      mReverb,
      disposicion,
      murosVista: DOC_MUROS,
      resumenFinal,
    },
  };
}

test('modeloDocumento: equiposHtml incluye parlante y amplificador siempre; streamer y dac sólo si están elegidos', () => {
  const sinFuentes = datosDocumentoFixture('es');
  const mSin = modeloDocumento(DOC_SPK, DOC_AMP, null, null, SALA_REVERB, 2.6, 'Alto', 100, sinFuentes.veredicto, sinFuentes.datos, '19 de agosto de 2026', 'es');
  assert.equal((mSin.equiposHtml.match(/doc-equipo"/g) ?? []).length, 2);
  assert.doesNotMatch(mSin.equiposHtml, /Streamer|DAC/);

  const conFuentes = datosDocumentoFixture('es', DOC_STREAMER, DOC_DAC);
  const mCon = modeloDocumento(DOC_SPK, DOC_AMP, DOC_STREAMER, DOC_DAC, SALA_REVERB, 2.6, 'Alto', 100, conFuentes.veredicto, conFuentes.datos, '19 de agosto de 2026', 'es');
  assert.equal((mCon.equiposHtml.match(/doc-equipo"/g) ?? []).length, 4);
  assert.match(mCon.equiposHtml, /Streamer/);
  assert.match(mCon.equiposHtml, />DAC</);

  // No recalcula specs — reusa los mismos helpers que ya arma "La cadena".
  assert.match(mCon.equiposHtml, new RegExp(especParlante(DOC_SPK, 'es').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(mCon.equiposHtml, new RegExp(especAmplificador(DOC_AMP, 'es').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(mCon.equiposHtml, new RegExp(especFuente(DOC_STREAMER, 'es').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('modeloDocumento: sala/distancia formateadas con el separador decimal del idioma (coma en es, punto en en)', () => {
  const fixEs = datosDocumentoFixture('es');
  const es = modeloDocumento(DOC_SPK, DOC_AMP, null, null, SALA_REVERB, 2.6, 'Alto', 100, fixEs.veredicto, fixEs.datos, 'x', 'es');
  const fixEn = datosDocumentoFixture('en');
  const en = modeloDocumento(DOC_SPK, DOC_AMP, null, null, SALA_REVERB, 2.6, 'High', 100, fixEn.veredicto, fixEn.datos, 'x', 'en');
  assert.equal(es.anchoLargoTexto, '3,6 × 5,0 m');
  assert.equal(en.anchoLargoTexto, '3.6 × 5.0 m');
  assert.equal(es.distanciaTexto, '≈ 2,6 m');
  assert.equal(en.distanciaTexto, '≈ 2.6 m');
});

test('modeloDocumento: veredictoTituloHtml/veredictoClase pasan tal cual el veredicto ya calculado, sin redactar de nuevo', () => {
  const fix = datosDocumentoFixture('es');
  const m = modeloDocumento(
    DOC_SPK,
    DOC_AMP,
    null,
    null,
    SALA_REVERB,
    2.6,
    'Alto',
    100,
    { tituloHtml: 'Configuración soportada, con límites', clase: 'warn' },
    fix.datos,
    'x',
    'es'
  );
  assert.equal(m.veredictoTituloHtml, 'Configuración soportada, con límites');
  assert.equal(m.veredictoClase, 'warn');
});

test('modeloDocumento: seccionesHtml incluye potencia y carga siempre; puente/recorrido sólo si la fuente está elegida y tiene dato', () => {
  const fixSin = datosDocumentoFixture('es');
  const mSin = modeloDocumento(DOC_SPK, DOC_AMP, null, null, SALA_REVERB, 2.6, 'Alto', 100, fixSin.veredicto, fixSin.datos, 'x', 'es');
  assert.match(mSin.seccionesHtml, /Potencia frente a los picos de la sala/);
  assert.match(mSin.seccionesHtml, /La carga que ve el amplificador/);
  assert.doesNotMatch(mSin.seccionesHtml, /el streamer y el amplificador/);

  const fixCon = datosDocumentoFixture('es', DOC_STREAMER, DOC_DAC);
  const mCon = modeloDocumento(DOC_SPK, DOC_AMP, DOC_STREAMER, DOC_DAC, SALA_REVERB, 2.6, 'Alto', 100, fixCon.veredicto, fixCon.datos, 'x', 'es');
  assert.match(mCon.seccionesHtml, /el streamer y el amplificador/);
  assert.match(mCon.seccionesHtml, /el DAC y el amplificador/);
});

test('modeloDocumento: seccionesHtml siempre incluye modos y reverberación (nunca "sin-datos" en esas dos, ver CLAUDE.md)', () => {
  const fix = datosDocumentoFixture('es');
  const m = modeloDocumento(DOC_SPK, DOC_AMP, null, null, SALA_REVERB, 2.6, 'Alto', 100, fix.veredicto, fix.datos, 'x', 'es');
  assert.match(m.seccionesHtml, /Modos de sala/);
  assert.match(m.seccionesHtml, /Tiempo de reverberación estimado/);
});

test('modeloDocumento: planoHtml incluye el SVG del plano en vista Superior (fija, no la que esté activa en resultado) y la ubicación de referencia de los parlantes', () => {
  const fix = datosDocumentoFixture('es');
  const m = modeloDocumento(DOC_SPK, DOC_AMP, null, null, SALA_REVERB, 2.6, 'Alto', 100, fix.veredicto, fix.datos, 'x', 'es');
  assert.match(m.planoHtml, /<svg/);
  assert.match(m.planoHtml, /punto dulce/);
  // vista Superior no dibuja las etiquetas de muro rotadas ±30° que sí usa isométrica
  assert.doesNotMatch(m.planoHtml, /transform="rotate\(-?30/);
});

test('modeloDocumento: resumenHtml reusa fortalezasHtml/debilidadesHtml/recomendacionesHtml de modeloResumenFinal, no redacta de nuevo', () => {
  const fix = datosDocumentoFixture('es');
  const m = modeloDocumento(DOC_SPK, DOC_AMP, null, null, SALA_REVERB, 2.6, 'Alto', 100, fix.veredicto, fix.datos, 'x', 'es');
  assert.match(m.resumenHtml, new RegExp(fix.datos.resumenFinal.comportamientoHtml.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(m.resumenHtml, new RegExp(fix.datos.resumenFinal.fortalezasHtml.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('modeloDocumento: fechaTexto se pasa tal cual — no es un dato del motor, main.ts lo arma con Date', () => {
  const fix = datosDocumentoFixture('es');
  const m = modeloDocumento(DOC_SPK, DOC_AMP, null, null, SALA_REVERB, 2.6, 'Alto', 100, fix.veredicto, fix.datos, '19 de agosto de 2026', 'es');
  assert.equal(m.fechaTexto, '19 de agosto de 2026');
});

test('modeloDocumento en inglés: specs y secciones en inglés, sin mezclar idiomas', () => {
  const fix = datosDocumentoFixture('en', DOC_STREAMER, DOC_DAC);
  const m = modeloDocumento(DOC_SPK, DOC_AMP, DOC_STREAMER, DOC_DAC, SALA_REVERB, 2.6, 'High', 100, fix.veredicto, fix.datos, 'August 19, 2026', 'en');
  assert.match(m.equiposHtml, /Speakers/);
  assert.match(m.equiposHtml, /Amplifier/);
  assert.doesNotMatch(m.equiposHtml, /Parlantes|Amplificador/);
  assert.match(m.seccionesHtml, /Power against the room.s peaks/);
  assert.doesNotMatch(m.seccionesHtml, /Potencia frente/);
});

// ---- modeloVeredicto / modeloRecomendacionesTop (veredicto + 3 estados, reemplaza al puntaje como encabezado) ----

function veredictoDe(datos: ReturnType<typeof datosDocumentoFixture>['datos']) {
  const entrada: EntradaVeredicto = {
    potencia: claseASeveridad(datos.mPot.verdictoClase) as 'ok' | 'warn' | 'alert',
    carga: claseASeveridad(datos.mCarga.verdictoClase),
    amortiguamiento: claseASeveridad(datos.mAmortiguamiento.verdictoClase),
    puenteStreamer: datos.mPuenteStreamer ? claseASeveridad(datos.mPuenteStreamer.verdictoClase) : null,
    recorridoStreamer: datos.mRecorridoStreamer ? claseASeveridad(datos.mRecorridoStreamer.verdictoClase) : null,
    puenteDac: datos.mPuenteDac ? claseASeveridad(datos.mPuenteDac.verdictoClase) : null,
    recorridoDac: datos.mRecorridoDac ? claseASeveridad(datos.mRecorridoDac.verdictoClase) : null,
    modos: datos.mModos.verdictoClase as 'ok' | 'warn',
    reverberacion: datos.mReverb.verdictoClase as 'ok' | 'warn',
  };
  return calcularVeredicto(entrada);
}

test('modeloVeredicto: todo "ok" → título "totalmente compatible", clase "ok"', () => {
  const fix = datosDocumentoFixture('es');
  // el fixture real (KEF LS50 Meta + Rega Brio, sala por defecto) ya trae
  // carga/modos en "warn" — se fuerzan los 4 componentes base a "ok" a
  // propósito para aislar el caso "todo bien", sin depender de que el
  // vector de catálogo elegido para las pruebas dé esa combinación.
  fix.datos.mPot = { ...fix.datos.mPot, verdictoClase: 'ok', verdictoTexto: 'Con margen' };
  fix.datos.mCarga = { ...fix.datos.mCarga, verdictoClase: 'ok', verdictoTexto: 'Cubierto' };
  fix.datos.mModos = { ...fix.datos.mModos, verdictoClase: 'ok', verdictoTexto: 'Sin agrupamiento' };
  fix.datos.mReverb = { ...fix.datos.mReverb, verdictoClase: 'ok', verdictoTexto: 'En rango' };
  const v = veredictoDe(fix.datos);
  const m = modeloVeredicto(v, fix.datos, 'es');
  assert.equal(m.clase, 'ok');
  assert.equal(m.tituloHtml, 'Configuración totalmente compatible');
  assert.equal(m.potencia.clase, 'ok');
  assert.equal(m.sala.clase, 'ok');
});

test('modeloVeredicto: potencia "alert" → título "no recomendada", subtexto nombra "Potencia"', () => {
  const fix = datosDocumentoFixture('es');
  fix.datos.mPot = { ...fix.datos.mPot, verdictoClase: 'alert', verdictoTexto: 'Insuficiente' };
  const v = veredictoDe(fix.datos);
  const m = modeloVeredicto(v, fix.datos, 'es');
  assert.equal(m.clase, 'alert');
  assert.equal(m.tituloHtml, 'Configuración no recomendada');
  assert.match(m.subtextoHtml, /Potencia/);
  assert.equal(m.potencia.estadoTexto, 'Insuficiente'); // etiqueta genérica por clase (estadoPotencia.alert)
  assert.equal(m.potencia.detalleTexto, 'Insuficiente'); // reusa el verdictoTexto real de mPot, no inventa uno
});

test('modeloVeredicto: acopleElectrico usa el peor de carga/puente/recorrido — el detalleTexto es el verdictoTexto de ESE componente, no uno inventado', () => {
  const fix = datosDocumentoFixture('es', DOC_STREAMER, null);
  // carga a "ok" explícito para que el único "warn" del grupo sea, sin
  // ambigüedad, el puente del streamer — si no, ambos podrían empatar en
  // severidad y el resultado dependería del orden interno, no de la regla.
  fix.datos.mCarga = { ...fix.datos.mCarga, verdictoClase: 'ok', verdictoTexto: 'Cubierto' };
  fix.datos.mPuenteStreamer = fix.datos.mPuenteStreamer && { ...fix.datos.mPuenteStreamer, verdictoClase: 'warn', verdictoTexto: 'Puente ajustado' };
  const v = veredictoDe(fix.datos);
  const m = modeloVeredicto(v, fix.datos, 'es');
  assert.equal(m.acopleElectrico.clase, 'warn');
  assert.equal(m.acopleElectrico.detalleTexto, 'Puente ajustado');
});

test('modeloVeredicto: acopleElectrico también considera amortiguamiento — cuando es el peor del grupo, su texto es el que se muestra', () => {
  const fix = datosDocumentoFixture('es');
  fix.datos.mCarga = { ...fix.datos.mCarga, verdictoClase: 'ok', verdictoTexto: 'Cubierto' };
  fix.datos.mAmortiguamiento = { ...fix.datos.mAmortiguamiento, sinDatos: false, verdictoClase: 'alert', verdictoTexto: 'Crítico' };
  const v = veredictoDe(fix.datos);
  const m = modeloVeredicto(v, fix.datos, 'es');
  assert.equal(m.acopleElectrico.clase, 'alert');
  assert.equal(m.acopleElectrico.detalleTexto, 'Crítico');
});

test('modeloVeredicto: acopleElectrico "sin-datos" (carga sin dato, sin streamer ni dac) → clase "dim", texto propio de sin-datos, y no cambia el veredicto general', () => {
  const fixBase = datosDocumentoFixture('es');
  const generalBase = veredictoDe(fixBase.datos).general;

  const fixSinDatos = datosDocumentoFixture('es');
  fixSinDatos.datos.mCarga = { ...fixSinDatos.datos.mCarga, sinDatos: true, verdictoClase: 'dim' };
  const v = veredictoDe(fixSinDatos.datos);
  const m = modeloVeredicto(v, fixSinDatos.datos, 'es');
  assert.equal(m.acopleElectrico.clase, 'dim');
  assert.equal(m.acopleElectrico.estadoTexto, 'Sin datos suficientes');
  // el grupo sin dato se excluye del cálculo — el veredicto general queda
  // igual que si carga nunca hubiera entrado en el promedio (no hay
  // promedio: el general sigue siendo el peor de potencia/sala, sin que
  // "sin-datos" en acople lo mueva a mejor ni a peor).
  assert.equal(v.general, generalBase);
});

test('modeloVeredicto en inglés: título y estados en inglés, sin mezclar idiomas', () => {
  const fix = datosDocumentoFixture('en');
  const v = veredictoDe(fix.datos);
  const m = modeloVeredicto(v, fix.datos, 'en');
  assert.match(m.tituloHtml, /match/i);
  assert.doesNotMatch(m.tituloHtml, /Configuración/);
  assert.doesNotMatch(m.potencia.estadoTexto + m.acopleElectrico.estadoTexto + m.sala.estadoTexto, /Suficiente|Correcto|Ajustada|Insuficiente|Conflicto|reparos|rango/);
});

test('modeloRecomendacionesTop: máximo 3, "alert" antes que "warn"', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'A', verdictoClase: 'warn', verdictoTexto: 'x', avisoHtml: 'aviso A' },
    { nombre: 'B', verdictoClase: 'alert', verdictoTexto: 'x', avisoHtml: 'aviso B' },
    { nombre: 'C', verdictoClase: 'warn', verdictoTexto: 'x', avisoHtml: 'aviso C' },
    { nombre: 'D', verdictoClase: 'alert', verdictoTexto: 'x', avisoHtml: 'aviso D' },
  ];
  const html = modeloRecomendacionesTop(componentes, 'es', 3);
  assert.equal((html.match(/<li>/g) ?? []).length, 3);
  // las dos "alert" (B, D) van antes que la primera "warn" que entra (A)
  assert.ok(html.indexOf('aviso B') < html.indexOf('aviso A'));
  assert.ok(html.indexOf('aviso D') < html.indexOf('aviso A'));
  assert.doesNotMatch(html, /aviso C/); // cuarta en la cola, no entra en el top 3
});

test('modeloRecomendacionesTop: sin nada que recomendar → mensaje de "todo ok"', () => {
  const componentes: ComponenteResumen[] = [{ nombre: 'A', verdictoClase: 'ok', verdictoTexto: 'x', avisoHtml: null }];
  const html = modeloRecomendacionesTop(componentes, 'es');
  assert.match(html, /No hay ningún punto pendiente/);
});
