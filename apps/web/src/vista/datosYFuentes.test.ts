// PURO — sin DOM. Corre contra equipos reales del catálogo: la tabla sólo
// relee fuente y confianza ya declaradas, y un dato ausente se muestra como
// ausente, nunca como un valor por defecto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOGO } from '../../../../packages/data/src/catalogo.ts';
import { modeloDatosYFuentes } from './datosYFuentes.ts';
import type { DatosParaTabla } from './datosYFuentes.ts';

function porNombre<T extends { nombre: string }>(lista: readonly T[], nombre: string): T {
  const x = lista.find((e) => e.nombre === nombre);
  assert.ok(x, `no está en el catálogo: ${nombre}`);
  return x;
}

const KEF = porNombre(CATALOGO.parlantes, 'KEF LS50 Meta');
const REGA = porNombre(CATALOGO.amplificadores, 'Rega Brio');

const BASE: DatosParaTabla = {
  spk: KEF,
  amp: REGA,
  streamer: null,
  dac: null,
  anchoM: 3.6,
  largoM: 5,
  altoM: 2.4,
  nivelTexto: 'Alto',
  picoObjetivoDb: 100,
};

test('grupos: parlante, amplificador y sala; streamer y DAC sólo si se eligieron', () => {
  const g = modeloDatosYFuentes(BASE, 'es');
  assert.deepEqual(g.map((x) => x.titulo), ['Parlantes · KEF LS50 Meta', 'Amplificador · Rega Brio', 'Sala y escucha']);
  const conFuentes = modeloDatosYFuentes(
    {
      ...BASE,
      streamer: porNombre(CATALOGO.streamers, CATALOGO.streamers[0]!.nombre),
      dac: porNombre(CATALOGO.dacs, CATALOGO.dacs[0]!.nombre),
    },
    'es'
  );
  assert.equal(conFuentes.length, 5);
  assert.match(conFuentes[2]!.titulo, /^Streamer · /);
  assert.match(conFuentes[3]!.titulo, /^DAC · /);
});

test('sensibilidad del parlante: valor, fuente y confianza tal cual las declara el catálogo', () => {
  const fila = modeloDatosYFuentes(BASE, 'es')[0]!.filas[0]!;
  assert.equal(fila.dato, 'Sensibilidad');
  assert.equal(fila.valor, '85 dB · convención sin declarar');
  assert.equal(fila.origen, KEF.sensibilidadDb.fuente.es);
  assert.equal(fila.estado, 'Confianza alta');
  const en = modeloDatosYFuentes(BASE, 'en')[0]!.filas[0]!;
  assert.equal(en.valor, '85 dB · convention not declared');
  assert.equal(en.origen, KEF.sensibilidadDb.fuente.en);
  assert.equal(en.estado, 'High confidence');
});

test('impedancia y demás campos sin cita propia: se declara "Sin cita propia" y se listan las referencias del equipo', () => {
  const fila = modeloDatosYFuentes(BASE, 'es')[0]!.filas[1]!;
  assert.equal(fila.dato, 'Impedancia nominal / mínima');
  assert.equal(fila.valor, '8 Ω / 3,5 Ω');
  assert.equal(fila.origen, KEF.fuentes.join(' · '));
  assert.equal(fila.estado, 'Sin cita propia');
});

test('dato ausente: potencia a 4 Ω no publicada se muestra como "No publicado / Sin dato", no como un valor', () => {
  const sin4 = CATALOGO.amplificadores.find((a) => a.potencia4OhmW === null);
  assert.ok(sin4, 'el catálogo debe tener algún amplificador sin potencia a 4 Ω para este caso');
  const filas = modeloDatosYFuentes({ ...BASE, amp: sin4 }, 'es')[1]!.filas;
  const f4 = filas.find((f) => f.dato === 'Potencia a 4 Ω')!;
  assert.equal(f4.valor, 'No publicado');
  assert.equal(f4.estado, 'Sin dato');
});

test('streamer/DAC sin voltaje ni impedancia de salida: "No publicado / No publicado" y "Sin dato"', () => {
  const vacia = CATALOGO.streamers.find((f) => f.salidaV === null && f.impedanciaSalidaOhm === null);
  assert.ok(vacia, 'el catálogo debe tener una fuente sin datos de salida');
  const g = modeloDatosYFuentes({ ...BASE, streamer: vacia }, 'es')[2]!;
  assert.equal(g.filas[0]?.valor, 'No publicado / No publicado');
  assert.equal(g.filas[0]?.estado, 'Sin dato');
});

test('formato numérico: enteros sin decimales y valores chicos sin redondearlos a 0 (0,05 Ω no es "0 Ω")', () => {
  const base = CATALOGO.streamers[0]!;
  const g = (salidaV: number, z: number): string =>
    modeloDatosYFuentes({ ...BASE, streamer: { ...base, salidaV, impedanciaSalidaOhm: z } }, 'es')[2]!.filas[0]!.valor;
  assert.equal(g(2, 100), '2 V / 100 Ω');
  assert.equal(g(2.5, 0.05), '2,5 V / 0,05 Ω');
  assert.equal(g(0.75, 47.5), '0,75 V / 47,5 Ω');
});

test('las notas se muestran como texto plano: se quitan las etiquetas y se compactan los espacios', () => {
  const conHtml = {
    ...KEF,
    sensibilidadDb: { ...KEF.sensibilidadDb, nota: { es: 'medición <b>independiente</b>   confirma', en: 'independent <b>measurement</b>' } },
    pendiente: { es: 'falta <b>Zmín</b> real', en: 'missing real <b>Zmin</b>' },
  };
  const g = modeloDatosYFuentes({ ...BASE, spk: conHtml }, 'es')[0]!;
  assert.equal(g.filas[0]?.nota, 'medición independiente confirma');
  assert.equal(g.nota, 'falta Zmín real');
});

test('ninguna nota del catálogo real llega con etiquetas HTML a la tabla', () => {
  const tieneHtml = (s: string | null): boolean => s !== null && /<[^>]+>/.test(s);
  const limpia = (g: { nota: string | null; filas: { nota: string | null }[] }): boolean =>
    !tieneHtml(g.nota) && g.filas.every((f) => !tieneHtml(f.nota));
  for (const p of CATALOGO.parlantes) assert.ok(modeloDatosYFuentes({ ...BASE, spk: p }, 'es').every(limpia), p.nombre);
  for (const a of CATALOGO.amplificadores) assert.ok(modeloDatosYFuentes({ ...BASE, amp: a }, 'es').every(limpia), a.nombre);
  for (const f of CATALOGO.streamers) assert.ok(modeloDatosYFuentes({ ...BASE, streamer: f }, 'es').every(limpia), f.nombre);
  for (const f of CATALOGO.dacs) assert.ok(modeloDatosYFuentes({ ...BASE, dac: f }, 'es').every(limpia), f.nombre);
});

test('sala: dimensiones del usuario, materiales como estimación y pico como criterio editorial', () => {
  const sala = modeloDatosYFuentes(BASE, 'es').at(-1)!;
  assert.equal(sala.filas.length, 3);
  assert.equal(sala.filas[0]?.valor, '3,6 × 5,0 × 2,40 m');
  assert.equal(sala.filas[0]?.estado, 'Sin medición independiente');
  assert.equal(sala.filas[1]?.estado, 'Estimación, no medición');
  assert.equal(sala.filas[2]?.valor, '100 dB');
  assert.equal(sala.filas[2]?.estado, 'Criterio editorial');
  assert.match(sala.filas[2]!.origen, /Alto/);
});
