import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarPotencia } from '../../../../packages/engine/src/potencia.ts';
import { evaluarCarga } from '../../../../packages/engine/src/carga.ts';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from '../../../../packages/engine/src/ganancia.ts';
import type { Parlante, Amplificador } from '../../../../packages/engine/src/tipos.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import { parlanteDelCatalogo, amplificadorDelCatalogo, fuenteDelCatalogo } from '../datos/adaptadores.ts';
import { modeloPotencia, modeloCarga, modeloPuente, modeloRecorrido } from './resultado.ts';

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

// ---- potencia ----

test('modeloPotencia: severidad "ok" → verdictoClase "ok", nunca "alert"/"dim"', () => {
  const spk = parlanteCat('klipsch-rp600m-ii');
  const amp = ampCat('cambridge-cxa81');
  const r = evaluarPotencia(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'), 2.5, 'alto');
  const m = modeloPotencia(spk, amp, r, 2.5, 'Alto', 100, 'es');
  assert.equal(m.verdictoClase, 'ok');
  assert.equal(r.codigo, 'con-margen');
  assert.equal(m.verdictoTexto, 'Con margen');
  assert.match(m.textoHtml, /Alcanza con holgura/);
});

test('modeloPotencia: severidad "alert" → texto de insuficiencia, no de sobra', () => {
  const spk = parlanteCat('kef-ls50-meta');
  const amp = ampCat('rega-brio');
  const r = evaluarPotencia(parlanteDelCatalogo(spk, 'es'), amplificadorDelCatalogo(amp, 'es'), 3.0, 'referencia');
  const m = modeloPotencia(spk, amp, r, 3.0, 'Referencia', 105, 'es');
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
  const r = evaluarPotencia(parlanteM, ampM, 2.5, 'moderado');
  const m = modeloPotencia(spkConMinimo, ampDebil, r, 2.5, 'Moderado', 90, 'es');
  assert.ok(m.avisoHtml, 'debería haber aviso: 30 W < 40 W recomendados');
  assert.match(m.avisoHtml!, /40/);

  const ampSuficiente = ampCat('rega-brio'); // 50 W ≥ 40 W recomendados
  const rSinAviso = evaluarPotencia(parlanteM, amplificadorDelCatalogo(ampSuficiente, 'es'), 2.5, 'moderado');
  const mSinAviso = modeloPotencia(spkConMinimo, ampSuficiente, rSinAviso, 2.5, 'Moderado', 90, 'es');
  assert.equal(mSinAviso.avisoHtml, null);
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

// ---- idioma 'en': mismos números, texto en inglés ----

test('modeloPotencia en inglés: mismo margenDb numérico, texto y veredicto en inglés, número con punto decimal', () => {
  const spk = parlanteCat('klipsch-rp600m-ii');
  const amp = ampCat('cambridge-cxa81');
  const r = evaluarPotencia(parlanteDelCatalogo(spk, 'en'), amplificadorDelCatalogo(amp, 'en'), 2.5, 'alto');
  const mEs = modeloPotencia(spk, amp, r, 2.5, 'Alto', 100, 'es');
  const mEn = modeloPotencia(spk, amp, r, 2.5, 'Alto', 100, 'en');
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
