import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarPotencia } from '../../../../packages/engine/src/potencia.ts';
import { evaluarCarga } from '../../../../packages/engine/src/carga.ts';
import { evaluarPuenteImpedancias, evaluarRecorridoVolumen } from '../../../../packages/engine/src/ganancia.ts';
import { evaluarModos } from '../../../../packages/engine/src/modos.ts';
import { calcularPuntaje, PESOS_DECLARADOS } from '../../../../packages/engine/src/puntaje.ts';
import type { ComponentePuntaje } from '../../../../packages/engine/src/puntaje.ts';
import type { Parlante, Amplificador } from '../../../../packages/engine/src/tipos.ts';
import type { ParlanteCat, AmplificadorCat, FuenteCat } from '../../../../packages/data/src/tipos-catalogo.ts';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import { parlanteDelCatalogo, amplificadorDelCatalogo, fuenteDelCatalogo } from '../datos/adaptadores.ts';
import { modeloPotencia, modeloCarga, modeloPuente, modeloRecorrido, modeloModos, modeloPuntaje, modeloResumenFinal } from './resultado.ts';
import type { ComponenteResumen } from './resultado.ts';

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
  assert.match(m.simpleHtml, /Sobra potencia/);
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

// ---- modos de sala ----

test('modeloModos: sala 3,6×5,0×2,4 (razón 3:2 ancho/alto) → "warn", con el par de agrupamiento en el aviso', () => {
  const r = evaluarModos({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  const m = modeloModos(r, 'es');
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

test('modeloModos: sala 2,5×3,0×2,2 sin agrupamiento → "ok", sin aviso ni sugerencia', () => {
  const r = evaluarModos({ anchoM: 2.5, largoM: 3.0, altoM: 2.2 });
  const m = modeloModos(r, 'es');
  assert.equal(m.verdictoClase, 'ok');
  assert.equal(m.verdictoTexto, 'Bien distribuidos');
  assert.equal(m.avisoHtml, null);
  assert.equal(m.sugerenciaHtml, null);
});

test('modeloModos nunca es "alert" ni "dim" — el techo de severidad de sala es "warn" (CLAUDE.md)', () => {
  const salas = [
    { anchoM: 2.5, largoM: 3.0, altoM: 2.2 },
    { anchoM: 3.6, largoM: 5.0, altoM: 2.4 },
    { anchoM: 4, largoM: 4, altoM: 2.5 },
  ];
  for (const sala of salas) {
    const clase = modeloModos(evaluarModos(sala), 'es').verdictoClase;
    assert.ok(clase === 'ok' || clase === 'warn', `clase inesperada: ${clase}`);
  }
});

test('modeloModos en inglés: veredicto y texto en inglés, sin mezclar idiomas', () => {
  const r = evaluarModos({ anchoM: 3.6, largoM: 5.0, altoM: 2.4 });
  const m = modeloModos(r, 'en');
  assert.equal(m.verdictoTexto, 'Clustered modes');
  assert.match(m.textoHtml, /mode pair/);
  assert.doesNotMatch(m.textoHtml, /par\(es\)/);
});

// ---- puntaje (capa criterio-editorial) ----

test('modeloPuntaje: todo "ok" da 10/10, detalle con los 5 componentes incluidos, sin aviso', () => {
  const componentes: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'ok' },
    { nombre: 'puente', peso: PESOS_DECLARADOS.puente, severidad: 'ok' },
    { nombre: 'recorrido', peso: PESOS_DECLARADOS.recorrido, severidad: 'ok' },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'ok' },
  ];
  const m = modeloPuntaje(calcularPuntaje(componentes), 'es');
  assert.equal(m.puntaje, 10);
  assert.equal(m.puntajeTexto, '10/10');
  assert.equal(m.avisoHtml, null);
  assert.match(m.detalleHtml, /Potencia: 10\/10/);
  assert.match(m.criterioHtml, /Criterio editorial/);
});

test('modeloPuntaje: sin streamer ni dac, el detalle marca puente/recorrido excluidos y avisa que no se evaluaron los 5', () => {
  const componentes: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'ok' },
    { nombre: 'puente', peso: PESOS_DECLARADOS.puente, severidad: null },
    { nombre: 'recorrido', peso: PESOS_DECLARADOS.recorrido, severidad: null },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'ok' },
  ];
  const m = modeloPuntaje(calcularPuntaje(componentes), 'es');
  assert.match(m.detalleHtml, /Puente de impedancias: sin dato suficiente, no cuenta/);
  assert.ok(m.avisoHtml !== null);
  assert.match(m.avisoHtml!, /3 de 5/);
});

test('modeloPuntaje en inglés: etiquetas de componente y criterio en inglés, sin mezclar idiomas', () => {
  const componentes: ComponentePuntaje[] = [
    { nombre: 'potencia', peso: PESOS_DECLARADOS.potencia, severidad: 'ok' },
    { nombre: 'carga', peso: PESOS_DECLARADOS.carga, severidad: 'ok' },
    { nombre: 'puente', peso: PESOS_DECLARADOS.puente, severidad: 'ok' },
    { nombre: 'recorrido', peso: PESOS_DECLARADOS.recorrido, severidad: 'ok' },
    { nombre: 'modos', peso: PESOS_DECLARADOS.modos, severidad: 'ok' },
  ];
  const m = modeloPuntaje(calcularPuntaje(componentes), 'en');
  assert.match(m.detalleHtml, /Power: 10\/10/);
  assert.match(m.criterioHtml, /Editorial criterion/);
  assert.doesNotMatch(m.detalleHtml, /Potencia/);
});

// ---- resumen final ----

test('modeloResumenFinal: componentes "ok" van a fortalezas, "warn"/"alert" a debilidades; "dim" no cuenta en ninguna', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Potencia', verdictoClase: 'ok', verdictoTexto: 'Con margen', avisoHtml: null },
    { nombre: 'Carga', verdictoClase: 'warn', verdictoTexto: 'Exige corriente', avisoHtml: '<b>Aviso de carga</b>' },
    { nombre: 'Puente de impedancias', verdictoClase: 'alert', verdictoTexto: 'Puente insuficiente', avisoHtml: '<b>Aviso de puente</b>' },
    { nombre: 'Modos de sala', verdictoClase: 'dim', verdictoTexto: 'Sin dato', avisoHtml: null },
  ];
  const m = modeloResumenFinal(componentes, 'es');
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
  const m = modeloResumenFinal(componentes, 'es');
  assert.match(m.resumenHtml, /De 1 componentes evaluados: 1 sin observaciones y 0 con algo para revisar/);
  assert.doesNotMatch(m.fortalezasHtml, /Puente/);
  assert.doesNotMatch(m.debilidadesHtml, /Puente/);
});

test('modeloResumenFinal: con "detalle" numérico, se agrega entre paréntesis junto al veredicto', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Potencia', verdictoClase: 'ok', verdictoTexto: 'Con margen', detalle: '+4,8 dB', avisoHtml: null },
  ];
  const m = modeloResumenFinal(componentes, 'es');
  assert.match(m.fortalezasHtml, /Potencia: Con margen \(\+4,8 dB\)/);
});

test('modeloResumenFinal: las recomendaciones incluyen TODAS las debilidades con aviso, no sólo la peor', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Carga', verdictoClase: 'warn', verdictoTexto: 'Exige corriente', avisoHtml: '<b>Aviso de carga</b>' },
    { nombre: 'Puente de impedancias', verdictoClase: 'alert', verdictoTexto: 'Puente insuficiente', avisoHtml: '<b>Aviso de puente</b>' },
  ];
  const m = modeloResumenFinal(componentes, 'es');
  assert.match(m.recomendacionesHtml, /Aviso de puente/);
  assert.match(m.recomendacionesHtml, /Aviso de carga/);
  assert.equal((m.recomendacionesHtml.match(/<li>/g) ?? []).length, 2);
});

test('modeloResumenFinal: debilidad sin avisoHtml no genera una recomendación vacía', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Carga', verdictoClase: 'warn', verdictoTexto: 'Exige corriente', avisoHtml: null },
  ];
  const m = modeloResumenFinal(componentes, 'es');
  assert.equal((m.recomendacionesHtml.match(/<li>/g) ?? []).length, 1);
  assert.match(m.recomendacionesHtml, /No hay ningún punto pendiente/);
});

test('modeloResumenFinal: todo "ok" → recomendación de cierre positivo, sin fortalezas ni debilidades vacías', () => {
  const componentes: ComponenteResumen[] = [
    { nombre: 'Potencia', verdictoClase: 'ok', verdictoTexto: 'Con margen', avisoHtml: null },
    { nombre: 'Carga', verdictoClase: 'ok', verdictoTexto: 'Cubierto', avisoHtml: null },
  ];
  const m = modeloResumenFinal(componentes, 'es');
  assert.match(m.debilidadesHtml, /Ningún componente evaluado quedó con algo para revisar/);
  assert.match(m.recomendacionesHtml, /No hay ningún punto pendiente/);
});

test('modeloResumenFinal en inglés: textos en inglés, sin mezclar idiomas', () => {
  const componentes: ComponenteResumen[] = [{ nombre: 'Power', verdictoClase: 'ok', verdictoTexto: 'With margin', avisoHtml: null }];
  const m = modeloResumenFinal(componentes, 'en');
  assert.match(m.fortalezasHtml, /Power: With margin/);
  assert.match(m.debilidadesHtml, /No evaluated component came out with something worth checking/);
  assert.match(m.recomendacionesHtml, /Nothing pending/);
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
